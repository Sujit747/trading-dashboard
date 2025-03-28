import pandas as pd
import numpy as np
import yfinance as yf
import backtrader as bt
import sys
import json
import logging
from datetime import datetime
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Custom Backtrader Strategy to Process Signals
class SignalStrategy(bt.Strategy):
    def __init__(self, signal_df):
        self.signal_df = signal_df
        self.order = None
        self.trades = []  # To store trade profits/losses (for reference, not used in metrics)
        self.returns = []  # To store daily returns with dates
        self.dates = []   # To store dates for returns
        self.entry_price = None  # To track entry price for profit/loss calculation

    def next(self):
        # Get the current date and price
        dt = pd.Timestamp(self.datas[0].datetime.date(0))
        close_price = self.datas[0].close[0]

        # Calculate daily return for all days
        if len(self.datas[0].close) > 1:
            prev_close = self.datas[0].close[-1]
            daily_return = (close_price - prev_close) / prev_close
            self.returns.append(daily_return)
            self.dates.append(dt)

        # Process signals
        if dt in self.signal_df.index:
            signal = self.signal_df.loc[dt].values[0]
            if signal == 1:
                if not self.position:  # If no position, buy
                    self.order = self.buy()
                    self.entry_price = close_price
                elif self.position.size < 0:  # If short, close short and buy
                    exit_price = close_price
                    profit = (self.entry_price - exit_price) / self.entry_price  # Short position profit
                    self.trades.append(profit)
                    self.order = self.close()
                    self.order = self.buy()
                    self.entry_price = close_price
            elif signal == -1:
                if self.position.size > 0:  # If long, close long and sell
                    exit_price = close_price
                    profit = (exit_price - self.entry_price) / self.entry_price  # Long position profit
                    self.trades.append(profit)
                    self.order = self.close()
                    self.order = self.sell()
                    self.entry_price = close_price
                elif not self.position:  # If no position, sell (short)
                    self.order = self.sell()
                    self.entry_price = close_price

    def stop(self):
        # Close any open position at the end of the backtest
        if self.position.size != 0 and self.entry_price is not None:
            exit_price = self.datas[0].close[0]
            if self.position.size > 0:  # Long position
                profit = (exit_price - self.entry_price) / self.entry_price
            else:  # Short position
                profit = (self.entry_price - exit_price) / self.entry_price
            self.trades.append(profit)
            self.order = self.close()

        # Convert returns to a pandas Series indexed by date
        self.returns = pd.Series(self.returns, index=self.dates)

def calculate_trade_metrics(trade_signals):
    """
    Calculate win rate, risk-reward ratio, and max losing streak from trade signals.
    Matches the Google Colab approach by using signal values directly.
    """
    start_time = time.time()
    logger.info("Starting trade metrics calculation")

    trades = trade_signals[trade_signals != 0].dropna()

    if trades.empty:
        logger.warning("Not enough trades to calculate metrics")
        return {"win_rate": None, "risk_reward_ratio": None, "max_losing_streak": 0}

    wins = (trades == 1).sum()
    losses = (trades == -1).sum()
    total_trades = wins + losses

    win_rate = wins / total_trades if total_trades > 0 else None
    risk_reward_ratio = (wins / losses) if losses > 0 else None

    losing_streaks = (trades == -1).astype(int).groupby((trades != -1).cumsum()).sum()
    max_losing_streak = int(losing_streaks.max()) if not losing_streaks.empty else 0

    logger.info(f"Trade metrics calculated in {time.time() - start_time:.2f} seconds")
    return {
        "win_rate": float(win_rate) if win_rate is not None else None,
        "risk_reward_ratio": float(risk_reward_ratio) if risk_reward_ratio is not None else None,
        "max_losing_streak": max_losing_streak
    }

def calculate_price_metrics(returns):
    """
    Calculate price metrics (Sharpe ratio, standard deviation, skewness) for a series of returns.
    """
    start_time = time.time()
    logger.info("Starting price metrics calculation")

    if not returns.tolist() or len(returns) < 2:
        logger.warning("Not enough returns data to calculate metrics")
        return {"sharpe_ratio": None, "std_dev": None, "skewness": None}

    returns = pd.Series(returns).dropna()

    if returns.empty:
        logger.warning("No returns data after filtering")
        return {"sharpe_ratio": None, "std_dev": None, "skewness": None}

    mean_return = returns.mean()
    std_dev = returns.std()
    sharpe_ratio = (mean_return / std_dev * np.sqrt(252)) if std_dev != 0 else None
    skewness = returns.skew()

    logger.info(f"Price metrics calculated in {time.time() - start_time:.2f} seconds")
    return {
        "sharpe_ratio": float(sharpe_ratio) if sharpe_ratio is not None else None,
        "std_dev": float(std_dev) if not np.isnan(std_dev) else None,
        "skewness": float(skewness) if not np.isnan(skewness) else None
    }

def calculate_beta(stock_returns, benchmark_prices):
    """
    Calculate beta of the stock against a benchmark.
    """
    start_time = time.time()
    logger.info("Starting beta calculation")

    stock_returns = pd.Series(stock_returns).dropna()
    benchmark_returns = benchmark_prices.pct_change().dropna()

    if stock_returns.empty or benchmark_returns.empty:
        logger.warning("Not enough data to calculate beta")
        return 0

    combined_returns = pd.concat([stock_returns, benchmark_returns], axis=1).dropna()
    if len(combined_returns) < 2:
        logger.warning("Not enough overlapping data points to calculate beta")
        return 0

    covariance = combined_returns.iloc[:, 0].cov(combined_returns.iloc[:, 1])
    benchmark_variance = combined_returns.iloc[:, 1].var()
    beta = covariance / benchmark_variance if benchmark_variance != 0 else 0

    logger.info(f"Beta calculated in {time.time() - start_time:.2f} seconds")
    return float(beta) if not np.isnan(beta) else 0

def prepare_backtrader_data(stock_data):
    """
    Ensure stock data is in a format compatible with Backtrader.
    """
    stock_data = stock_data.copy()
    stock_data.columns = ['close']
    stock_data['open'] = stock_data['close']
    stock_data['high'] = stock_data['close']
    stock_data['low'] = stock_data['close']
    stock_data['volume'] = 0
    stock_data = stock_data[['open', 'high', 'low', 'close', 'volume']]
    return stock_data

def run_backtest(signal_df, stock_data):
    """
    Run a Backtrader backtest for the given signal and stock data.
    """
    cerebro = bt.Cerebro()

    stock_data = prepare_backtrader_data(stock_data)
    data = bt.feeds.PandasData(dataname=stock_data)

    cerebro.adddata(data)
    cerebro.addstrategy(SignalStrategy, signal_df=signal_df)
    cerebro.addsizer(bt.sizers.FixedSize, stake=10)

    logger.info("Running Backtrader backtest...")
    cerebro.run()
    logger.info("Backtest completed.")
    return cerebro.runstrats[0][0]  # Return the strategy instance

def detect_delimiter(file_path):
    """
    Detect the delimiter in the CSV file ('|' or ',').
    """
    with open(file_path, 'r') as f:
        first_line = f.readline().strip()
        if '|' in first_line:
            return '|'
        elif ',' in first_line:
            return ','
        else:
            return None

def validate_ticker(ticker, start, end):
    """
    Validate if a ticker exists by attempting to fetch data using yfinance.
    """
    try:
        data = yf.download(ticker, start=start, end=end, auto_adjust=True)
        if data.empty:
            logger.warning(f"No data retrieved for ticker {ticker}")
            return False
        return True
    except Exception as e:
        logger.warning(f"Error validating ticker {ticker}: {str(e)}")
        return False

def fetch_benchmark_data(start, end):
    """
    Fetch benchmark data (Nifty 50) using yfinance for beta calculation.
    """
    try:
        benchmark_symbol = '^NSEI'
        logger.info(f"Fetching benchmark data for {benchmark_symbol} from {start} to {end}")
        data = yf.download(benchmark_symbol, start=start, end=end, auto_adjust=True)['Close']
        if data.empty:
            logger.warning("No benchmark data retrieved")
            return None
        logger.info(f"Benchmark data retrieved with {len(data)} entries")
        return data
    except Exception as e:
        logger.error(f"Error fetching benchmark data: {str(e)}")
        return None

def main(file_path):
    """
    Main function to process the signal file and calculate company metrics using Backtrader.
    """
    start_time = time.time()
    logger.info("Starting main function")

    try:
        # Step 1: Detect delimiter and read the CSV file
        delimiter = detect_delimiter(file_path)
        if delimiter is None:
            logger.error("Could not detect delimiter in the CSV file")
            return {"error": "Could not detect delimiter in the CSV file. Expected '|' or ','."}
        df = pd.read_csv(file_path, sep=delimiter, parse_dates=['Date'], index_col='Date', dayfirst=True)
        logger.info(f"Raw DataFrame columns: {df.columns.tolist()}")
        logger.info(f"First few rows of the DataFrame:\n{df.head()}")

        # Debug: Log the type of the index and the start/end dates
        logger.info(f"Index type: {type(df.index)}")
        logger.info(f"Index sample: {df.index[:5]}")

        # Step 2: Check for valid trades
        if not (df != 0).any().any():
            logger.error("Signal file contains no valid trades")
            return {"error": "Signal file contains no valid trades (all values are zero)."}

        # Step 3: Identify tickers
        tickers = [ticker for ticker in df.columns if isinstance(ticker, str) and ticker.endswith('.NS')]
        if not tickers:
            logger.error("No valid tickers found in the signal file")
            return {"error": "No valid tickers found in the signal file."}

        # Step 4: Validate tickers
        logger.info(f"Validating {len(tickers)} tickers")
        start_date = df.index.min()
        end_date = df.index.max()
        logger.info(f"Start date: {start_date} (type: {type(start_date)})")
        logger.info(f"End date: {end_date} (type: {type(end_date)})")

        valid_tickers = []
        for ticker in tickers:
            if validate_ticker(ticker, start_date, end_date):
                valid_tickers.append(ticker)
            else:
                logger.warning(f"Skipping ticker {ticker} as it is invalid")

        if not valid_tickers:
            logger.error("No valid tickers found after validation")
            return {"error": "No valid tickers found after validation. Check if ticker symbols are correct."}

        # Step 5: Fetch benchmark data for beta calculation
        benchmark_data = fetch_benchmark_data(start_date, end_date)
        if benchmark_data is None:
            logger.warning("Proceeding without benchmark data; beta will be 0")

        # Step 6: Process each ticker using Backtrader
        results = {}
        for ticker in valid_tickers:
            try:
                logger.info(f"Processing ticker {ticker}")
                # Ensure start_date and end_date are in the correct format
                start_str = start_date.strftime('%Y-%m-%d') if isinstance(start_date, (pd.Timestamp, datetime)) else start_date
                end_str = end_date.strftime('%Y-%m-%d') if isinstance(end_date, (pd.Timestamp, datetime)) else end_date
                # Fetch stock data
                stock_data = yf.download(ticker, start=start_str, end=end_str, auto_adjust=True)[['Close']]
                stock_data = stock_data.rename(columns={'Close': ticker})

                if stock_data.empty:
                    logger.warning(f"No price data for {ticker}")
                    continue

                # Run Backtrader backtest
                strategy = run_backtest(df[[ticker]], stock_data[ticker])

                # Calculate metrics
                trade_metrics = calculate_trade_metrics(df[ticker])  # Use signal values directly
                price_metrics = calculate_price_metrics(strategy.returns)
                beta_value = calculate_beta(strategy.returns, benchmark_data) if benchmark_data is not None else 0
                combined_metrics = {**trade_metrics, **price_metrics, "beta": beta_value}
                results[ticker] = combined_metrics
            except Exception as e:
                logger.error(f"Error processing {ticker}: {str(e)}")
                continue

        if not results:
            logger.error("No valid data found for any ticker after processing")
            return {"error": "No valid data found for any ticker after processing. Check if data is available for the date range."}

        logger.info(f"Main function completed in {time.time() - start_time:.2f} seconds")
        logger.info(f"Results: {results}")  # Log the results for debugging
        return results

    except Exception as e:
        logger.error(f"Error in main function: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Please provide the CSV file path as an argument."}))
        sys.exit(1)
    file_path = sys.argv[1]
    result = main(file_path)
    print(json.dumps(result, indent=2, default=lambda x: None))