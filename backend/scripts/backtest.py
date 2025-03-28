import pandas as pd
import numpy as np
import yfinance as yf
import itertools
import backtrader as bt
from datetime import datetime
import sys
import json
import os

# Load Trade Signal Data
def load_signal_data(file_path):
    try:
        signal_df = pd.read_csv(file_path, parse_dates=['Date'], index_col='Date', dayfirst=True)
        print("Debug: Signal data loaded:\n", signal_df.head(), file=sys.stderr)  # Print to stderr
        return signal_df
    except Exception as e:
        raise ValueError(f"Error reading CSV file: {e}")

# Fetch Price Data
def fetch_price_data(tickers, start_date, end_date):
    try:
        print(f"Debug: Fetching price data for {tickers} from {start_date} to {end_date}", file=sys.stderr)  # Print to stderr
        price_data = yf.download(tickers, start=start_date, end=end_date, auto_adjust=True)['Close']
        if price_data.empty:
            raise ValueError("No price data retrieved. Check ticker symbols or date range.")
        print(f"Debug: Fetched price data for {tickers}:\n", price_data.head(), file=sys.stderr)  # Print to stderr
        return price_data
    except Exception as e:
        raise ValueError(f"Error fetching stock data: {e}")

# Calculate Trade Metrics
def calculate_trade_metrics(signal_df):
    all_signals = signal_df.values.flatten()
    trades = all_signals[all_signals != 0]

    if len(trades) < 2:
        return {'win_rate': np.nan, 'risk_reward_ratio': np.nan, 'max_losing_streak': np.nan}

    win_rate = (trades > 0).sum() / len(trades)

    positive_returns = trades[trades > 0]
    negative_returns = -trades[trades < 0]
    avg_positive = np.mean(positive_returns) if len(positive_returns) > 0 else 0
    avg_negative = np.mean(negative_returns) if len(negative_returns) > 0 else 0
    risk_reward_ratio = (avg_positive / avg_negative) if avg_negative > 0 else np.nan

    losing_streaks = [sum(1 for _ in group) for key, group in itertools.groupby(trades < 0) if key]
    max_losing_streak = max(losing_streaks, default=0)

    return {
        'win_rate': float(win_rate),
        'risk_reward_ratio': float(risk_reward_ratio) if not np.isnan(risk_reward_ratio) else 0,
        'max_losing_streak': int(max_losing_streak)
    }

# Calculate Price Metrics
def calculate_price_metrics(price_df):
    returns = price_df.pct_change().dropna()

    if returns.empty:
        return {'sharpe_ratio': np.nan, 'std_dev': np.nan, 'skewness': np.nan}

    std_dev = returns.std()
    sharpe_ratio = returns.mean() / std_dev if std_dev.any() else np.nan
    skewness = returns.skew()

    return {
        'sharpe_ratio': float(sharpe_ratio.mean()) if not np.isnan(sharpe_ratio.mean()) else 0,
        'std_dev': float(std_dev.mean()) if not np.isnan(std_dev.mean()) else 0,
        'skewness': float(skewness.mean()) if not np.isnan(skewness.mean()) else 0
    }

# Calculate Beta Against Benchmark
def calculate_beta(price_df, benchmark_df):
    """Calculate beta of the stock against a benchmark."""
    print("Debug: Calculating beta...", file=sys.stderr)  # Print to stderr
    print("Debug: Stock price data:\n", price_df.head(), file=sys.stderr)  # Print to stderr
    print("Debug: Benchmark price data:\n", benchmark_df.head(), file=sys.stderr)  # Print to stderr

    stock_returns = price_df.pct_change().dropna()
    benchmark_returns = benchmark_df.pct_change().dropna()

    print("Debug: Stock returns:\n", stock_returns.head(), file=sys.stderr)  # Print to stderr
    print("Debug: Benchmark returns:\n", benchmark_returns.head(), file=sys.stderr)  # Print to stderr

    if stock_returns.empty or benchmark_returns.empty:
        print("Debug: Returns are empty. Stock returns empty:", stock_returns.empty, "Benchmark returns empty:", benchmark_returns.empty, file=sys.stderr)  # Print to stderr
        return np.nan

    combined_returns = stock_returns.join(benchmark_returns, how='inner', lsuffix='_stock', rsuffix='_benchmark')
    print("Debug: Combined returns:\n", combined_returns.head(), file=sys.stderr)  # Print to stderr

    if len(combined_returns) < 2:
        print("Debug: Not enough overlapping data points:", len(combined_returns), file=sys.stderr)  # Print to stderr
        return np.nan

    covariance = combined_returns.cov().iloc[0, 1]
    benchmark_variance = combined_returns.var().iloc[1]

    print("Debug: Covariance:", covariance, "Benchmark variance:", benchmark_variance, file=sys.stderr)  # Print to stderr

    beta = covariance / benchmark_variance if benchmark_variance != 0 else np.nan
    print("Debug: Calculated beta:", beta, file=sys.stderr)  # Print to stderr

    return float(beta) if not np.isnan(beta) else 0

# Main Execution
def main(file_path):
    try:
        # Load trade signals
        signal_df = load_signal_data(file_path)

        # Get stock tickers from CSV columns
        tickers = list(signal_df.columns)
        if not tickers:
            raise ValueError("No tickers found in the signal file.")
        selected_ticker = tickers[0]
        print("Debug: Selected ticker:", selected_ticker, file=sys.stderr)  # Print to stderr

        start_date, end_date = signal_df.index.min(), signal_df.index.max()
        print("Debug: Date range:", start_date, "to", end_date, file=sys.stderr)  # Print to stderr

        # Fetch stock prices for the selected ticker
        price_df = fetch_price_data(selected_ticker, start_date, end_date)

        # Fetch benchmark prices (Nifty 50 index)
        benchmark_symbol = '^NSEI'
        benchmark_df = fetch_price_data(benchmark_symbol, start_date, end_date)

        # Compute metrics
        trade_metrics = calculate_trade_metrics(signal_df)
        price_metrics = calculate_price_metrics(price_df)
        beta_value = calculate_beta(price_df, benchmark_df)

        # Merge results
        all_metrics = {**trade_metrics, **price_metrics, 'beta': beta_value}
        return all_metrics

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Please provide the CSV file path as an argument."}))
        sys.exit(1)

    file_path = sys.argv[1]
    result = main(file_path)
    print(json.dumps(result))  # This goes to stdout