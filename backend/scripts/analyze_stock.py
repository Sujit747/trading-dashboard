import pandas as pd
import numpy as np
import requests
import json
import sys
from datetime import datetime, timedelta
import os
# Constants
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "default_key")

def fetch_stock_data_alpha_vantage(symbol, period='3mo'):
    """Fetch stock data from Alpha Vantage API with error handling"""
    try:
        if period == '1mo':
            output_size = "compact"
        else:
            output_size = "full"

        url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&outputsize={output_size}&apikey={ALPHA_VANTAGE_API_KEY}"
        response = requests.get(url, timeout=15)

        if response.status_code != 200:
            return {"error": f"Error fetching data for {symbol}: Status code {response.status_code}"}

        try:
            data = response.json()
        except json.JSONDecodeError:
            return {"error": f"Invalid JSON response from Alpha Vantage for {symbol}"}

        if "Error Message" in data:
            return {"error": f"Alpha Vantage API error: {data['Error Message']}"}

        if "Time Series (Daily)" not in data:
            return {"error": f"No daily time series data found for {symbol}"}

        time_series = data["Time Series (Daily)"]
        df = pd.DataFrame.from_dict(time_series, orient='index')

        df = df.rename(columns={
            '1. open': 'Open',
            '2. high': 'High',
            '3. low': 'Low',
            '4. close': 'Close',
            '5. volume': 'Volume'
        })

        for col in ['Open', 'High', 'Low', 'Close', 'Volume']:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        df.index = pd.to_datetime(df.index)
        df = df.sort_index()

        end_date = datetime.now()
        if period == '1mo':
            start_date = end_date - timedelta(days=30)
        elif period == '3mo':
            start_date = end_date - timedelta(days=90)
        elif period == '6mo':
            start_date = end_date - timedelta(days=180)
        elif period == '1y':
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=90)

        df = df[df.index >= start_date]

        return df

    except Exception as e:
        return {"error": f"Error fetching data for {symbol}: {str(e)}"}

def calculate_technical_indicators(df):
    """Calculate technical indicators for analysis"""
    if isinstance(df, dict) and "error" in df:
        return df

    if len(df) < 20:
        return {"error": "Not enough data to calculate indicators"}

    df['SMA_20'] = df['Close'].rolling(window=20).mean()
    df['SMA_50'] = df['Close'].rolling(window=50).mean()
    df['EMA_9'] = df['Close'].ewm(span=9, adjust=False).mean()
    df['EMA_21'] = df['Close'].ewm(span=21, adjust=False).mean()

    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))

    exp1 = df['Close'].ewm(span=12, adjust=False).mean()
    exp2 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = exp1 - exp2
    df['Signal_Line'] = df['MACD'].ewm(span=9, adjust=False).mean()
    df['MACD_Histogram'] = df['MACD'] - df['Signal_Line']

    df['BB_Middle'] = df['Close'].rolling(window=20).mean()
    df['BB_Std'] = df['Close'].rolling(window=20).std()
    df['BB_Upper'] = df['BB_Middle'] + (df['BB_Std'] * 2)
    df['BB_Lower'] = df['BB_Middle'] - (df['BB_Std'] * 2)

    df['TR'] = np.maximum(
        np.maximum(
            df['High'] - df['Low'],
            abs(df['High'] - df['Close'].shift())
        ),
        abs(df['Low'] - df['Close'].shift())
    )
    df['ATR'] = df['TR'].rolling(window=14).mean()

    return df

def generate_signals(df):
    """Generate trading signals based on technical indicators"""
    if isinstance(df, dict) and "error" in df:
        return df

    if len(df) < 50:
        return {"error": "Not enough data to generate signals"}

    df['Signal'] = 'NEUTRAL'
    df['Signal_Strength'] = 0

    df.loc[df['RSI'] < 30, 'RSI_Signal'] = 'BUY'
    df.loc[df['RSI'] > 70, 'RSI_Signal'] = 'SELL'
    df.loc[(df['RSI'] >= 30) & (df['RSI'] <= 70), 'RSI_Signal'] = 'NEUTRAL'

    df['MACD_Signal'] = 'NEUTRAL'
    df.loc[(df['MACD'] > df['Signal_Line']) & (df['MACD'].shift() <= df['Signal_Line'].shift()), 'MACD_Signal'] = 'BUY'
    df.loc[(df['MACD'] < df['Signal_Line']) & (df['MACD'].shift() >= df['Signal_Line'].shift()), 'MACD_Signal'] = 'SELL'

    df['MA_CrossOver_Signal'] = 'NEUTRAL'
    df.loc[(df['EMA_9'] > df['EMA_21']) & (df['EMA_9'].shift() <= df['EMA_21'].shift()), 'MA_CrossOver_Signal'] = 'BUY'
    df.loc[(df['EMA_9'] < df['EMA_21']) & (df['EMA_9'].shift() >= df['EMA_21'].shift()), 'MA_CrossOver_Signal'] = 'SELL'

    df['Price_SMA_Signal'] = 'NEUTRAL'
    df.loc[(df['Close'] > df['SMA_50']) & (df['SMA_20'] > df['SMA_50']), 'Price_SMA_Signal'] = 'BUY'
    df.loc[(df['Close'] < df['SMA_50']) & (df['SMA_20'] < df['SMA_50']), 'Price_SMA_Signal'] = 'SELL'

    df['BB_Signal'] = 'NEUTRAL'
    df.loc[df['Close'] < df['BB_Lower'], 'BB_Signal'] = 'BUY'
    df.loc[df['Close'] > df['BB_Upper'], 'BB_Signal'] = 'SELL'

    df['Volume_Ratio'] = df['Volume'] / df['Volume'].rolling(window=20).mean()
    df['Volume_Signal'] = 'NEUTRAL'
    df.loc[(df['Volume_Ratio'] > 1.5) & (df['Close'] > df['Close'].shift()), 'Volume_Signal'] = 'BUY'
    df.loc[(df['Volume_Ratio'] > 1.5) & (df['Close'] < df['Close'].shift()), 'Volume_Signal'] = 'SELL'

    df['Signal_Strength'] = 0
    for signal_col in ['RSI_Signal', 'MACD_Signal', 'MA_CrossOver_Signal', 'Price_SMA_Signal', 'BB_Signal', 'Volume_Signal']:
        df.loc[df[signal_col] == 'BUY', 'Signal_Strength'] += 1
        df.loc[df[signal_col] == 'SELL', 'Signal_Strength'] -= 1

    df.loc[df['Signal_Strength'] >= 2, 'Signal'] = 'STRONG BUY'
    df.loc[(df['Signal_Strength'] == 1), 'Signal'] = 'BUY'
    df.loc[(df['Signal_Strength'] == 0), 'Signal'] = 'NEUTRAL'
    df.loc[(df['Signal_Strength'] == -1), 'Signal'] = 'SELL'
    df.loc[df['Signal_Strength'] <= -2, 'Signal'] = 'STRONG SELL'

    return df

def calculate_metrics(df, symbol):
    """Calculate key metrics for screening"""
    if isinstance(df, dict) and "error" in df:
        return df

    if len(df) < 20:
        return {"error": "Not enough data to calculate metrics"}

    metrics = {}
    try:
        metrics['Symbol'] = symbol
        # Use .iloc[-1] for position-based indexing to avoid FutureWarning
        metrics['Current Price'] = round(df['Close'].iloc[-1], 2)
        metrics['Price Change %'] = round(((df['Close'].iloc[-1] - df['Close'].iloc[-2]) / df['Close'].iloc[-2]) * 100, 2)
        metrics['Volume'] = int(df['Volume'].iloc[-1])
        metrics['Avg Volume (20D)'] = round(df['Volume'].rolling(window=20).mean().iloc[-1], 0)
        metrics['Volume Ratio'] = round(df['Volume'].iloc[-1] / df['Volume'].rolling(window=20).mean().iloc[-1], 2)
        metrics['RSI'] = round(df['RSI'].iloc[-1], 2)
        metrics['MACD'] = round(df['MACD'].iloc[-1], 2)
        metrics['Signal Line'] = round(df['Signal_Line'].iloc[-1], 2)
        metrics['MACD Histogram'] = round(df['MACD_Histogram'].iloc[-1], 2)
        # Convert boolean to string to ensure JSON serializability
        metrics['Above SMA20'] = str(df['Close'].iloc[-1] > df['SMA_20'].iloc[-1])
        metrics['Above SMA50'] = str(df['Close'].iloc[-1] > df['SMA_50'].iloc[-1])
        metrics['EMA9 vs EMA21'] = 'ABOVE' if df['EMA_9'].iloc[-1] > df['EMA_21'].iloc[-1] else 'BELOW'
        metrics['BB Position'] = round((df['Close'].iloc[-1] - df['BB_Lower'].iloc[-1]) / (df['BB_Upper'].iloc[-1] - df['BB_Lower'].iloc[-1]), 2)
        metrics['ATR'] = round(df['ATR'].iloc[-1], 2)
        metrics['ATR %'] = round((df['ATR'].iloc[-1] / df['Close'].iloc[-1]) * 100, 2)
        metrics['Volatility (20D)'] = round(df['Close'].pct_change().std() * np.sqrt(252) * 100, 2)
        metrics['RSI Signal'] = df['RSI_Signal'].iloc[-1]
        metrics['MACD Signal'] = df['MACD_Signal'].iloc[-1]
        metrics['MA Crossover Signal'] = df['MA_CrossOver_Signal'].iloc[-1]
        metrics['Price-SMA Signal'] = df['Price_SMA_Signal'].iloc[-1]
        metrics['BB Signal'] = df['BB_Signal'].iloc[-1]
        metrics['Volume Signal'] = df['Volume_Signal'].iloc[-1]
        metrics['Signal'] = df['Signal'].iloc[-1]
        metrics['Signal Strength'] = int(df['Signal_Strength'].iloc[-1])

        return metrics
    except Exception as e:
        return {"error": f"Error calculating metrics for {symbol}: {str(e)}"}

def get_fundamentals_alpha_vantage(symbol):
    """Get fundamental data from Alpha Vantage (Company Overview)"""
    try:
        url = f"https://www.alphavantage.co/query?function=OVERVIEW&symbol={symbol}&apikey={ALPHA_VANTAGE_API_KEY}"
        response = requests.get(url, timeout=10)

        if response.status_code != 200:
            return {"error": f"Error fetching fundamentals for {symbol}: Status code {response.status_code}"}

        data = response.json()
        if not data or len(data) <= 1:
            return {"error": f"No fundamental data found for {symbol}"}

        fundamentals = {
            'Name': data.get('Name', 'N/A'),
            'Sector': data.get('Sector', 'N/A'),
            'Industry': data.get('Industry', 'N/A'),
            'Market Cap': data.get('MarketCapitalization', 'N/A'),
            'PE Ratio': data.get('PERatio', 'N/A'),
            'EPS': data.get('EPS', 'N/A'),
            'Dividend Yield': data.get('DividendYield', 'N/A'),
            '52-Week High': data.get('52WeekHigh', 'N/A'),
            '52-Week Low': data.get('52WeekLow', 'N/A')
        }

        return fundamentals
    except Exception as e:
        return {"error": f"Error fetching fundamentals for {symbol}: {str(e)}"}

def prepare_chart_data(df):
    """Prepare data for candlestick, RSI, and MACD charts"""
    if isinstance(df, dict) and "error" in df:
        return df

    # Replace NaN with None (null in JSON) for all relevant columns
    df = df.replace({np.nan: None})

    candlestick_data = {
        "x": df.index.strftime('%Y-%m-%d').tolist(),
        "open": df['Open'].tolist(),
        "high": df['High'].tolist(),
        "low": df['Low'].tolist(),
        "close": df['Close'].tolist(),
        "sma_20": df['SMA_20'].tolist(),
        "sma_50": df['SMA_50'].tolist(),
        "bb_upper": df['BB_Upper'].tolist(),
        "bb_lower": df['BB_Lower'].tolist(),
        "buy_signals": df[df['Signal'] == 'STRONG BUY'].index.strftime('%Y-%m-%d').tolist(),
        "buy_prices": (df[df['Signal'] == 'STRONG BUY']['Low'] * 0.99).tolist(),
        "sell_signals": df[df['Signal'] == 'STRONG SELL'].index.strftime('%Y-%m-%d').tolist(),
        "sell_prices": (df[df['Signal'] == 'STRONG SELL']['High'] * 1.01).tolist()
    }

    rsi_data = {
        "x": df.index.strftime('%Y-%m-%d').tolist(),
        "rsi": df['RSI'].tolist()
    }

    macd_data = {
        "x": df.index.strftime('%Y-%m-%d').tolist(),
        "macd": df['MACD'].tolist(),
        "signal_line": df['Signal_Line'].tolist(),
        "histogram": df['MACD_Histogram'].tolist(),
        "histogram_colors": ['green' if val is not None and val >= 0 else 'red' for val in df['MACD_Histogram']]
    }

    historical_data = df[['Open', 'High', 'Low', 'Close', 'Volume', 'Signal']].copy()
    historical_data.index = historical_data.index.strftime('%Y-%m-%d')
    historical_data = historical_data.to_dict(orient='index')

    recent_signals = df.tail(10)[['RSI_Signal', 'MACD_Signal', 'MA_CrossOver_Signal', 'BB_Signal', 'Volume_Signal', 'Signal', 'Signal_Strength']].copy()
    recent_signals.index = recent_signals.index.strftime('%Y-%m-%d')
    recent_signals = recent_signals.rename(columns={
        'RSI_Signal': 'RSI',
        'MACD_Signal': 'MACD',
        'MA_CrossOver_Signal': 'MA Cross',
        'BB_Signal': 'Bollinger',
        'Volume_Signal': 'Volume',
        'Signal_Strength': 'Strength'
    })
    recent_signals = recent_signals.to_dict(orient='index')

    return {
        "candlestick": candlestick_data,
        "rsi": rsi_data,
        "macd": macd_data,
        "historical_data": historical_data,
        "recent_signals": recent_signals
    }

def analyze_stock(symbol, period):
    """Main function to analyze a single stock"""
    df = fetch_stock_data_alpha_vantage(symbol, period)
    if isinstance(df, dict) and "error" in df:
        return df

    df = calculate_technical_indicators(df)
    if isinstance(df, dict) and "error" in df:
        return df

    df = generate_signals(df)
    if isinstance(df, dict) and "error" in df:
        return df

    metrics = calculate_metrics(df, symbol)
    if isinstance(metrics, dict) and "error" in metrics:
        return metrics

    fundamentals = get_fundamentals_alpha_vantage(symbol)
    if isinstance(fundamentals, dict) and "error" in fundamentals:
        fundamentals = None

    chart_data = prepare_chart_data(df)

    return {
        "metrics": metrics,
        "fundamentals": fundamentals,
        "chart_data": chart_data
    }

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Please provide symbol and period as arguments"}))
        sys.exit(1)

    symbol = sys.argv[1]
    period = sys.argv[2]
    result = analyze_stock(symbol, period)
    print(json.dumps(result, default=str))  # Use default=str to handle non-serializable types