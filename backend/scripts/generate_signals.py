import sys
import pandas as pd
import json

def generate_signals(entry_file, exit_file):
    try:
        # Load entry and exit files
        entry_df = pd.read_csv(entry_file)
        exit_df = pd.read_csv(exit_file)

        # Combine signals (adjust this logic based on your file format)
        # Assuming both files have 'Ticker' and 'Signal' columns
        combined = pd.merge(entry_df, exit_df, on='Ticker', suffixes=('_entry', '_exit'))
        combined['Combined_Signal'] = combined.apply(
            lambda row: 'HOLD' if row['Signal_entry'] == 'BUY' and row['Signal_exit'] == 'SELL' else 'NEUTRAL',
            axis=1
        )

        # Return the result as JSON
        result = combined[['Ticker', 'Combined_Signal']].to_dict(orient='records')
        return {"signals": result}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Please provide entry and exit file paths"}))
        sys.exit(1)

    entry_file = sys.argv[1]
    exit_file = sys.argv[2]
    result = generate_signals(entry_file, exit_file)
    print(json.dumps(result))