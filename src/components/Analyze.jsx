import React, { useState } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';

const Analyze = () => {
  const [symbol, setSymbol] = useState('');
  const [period, setPeriod] = useState('3mo');
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Price Chart'); // State to manage active tab

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      const response = await axios.post(
        'http://localhost:5001/api/analyze',
        { symbol, period },
        { timeout: 30000 }
      );
      setAnalysisData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch analysis data');
    } finally {
      setLoading(false);
    }
  };

  const signalColor = (signal) => {
    return {
      'STRONG BUY': 'text-green-500',
      'BUY': 'text-lime-400',
      'NEUTRAL': 'text-gray-500',
      'SELL': 'text-pink-500',
      'STRONG SELL': 'text-red-500',
    }[signal] || 'text-gray-500';
  };

  const tabs = ['Price Chart', 'Technical Indicators', 'Signal Details', 'Historical Data'];

  return (
    <div className="p-6 bg-[#1A1A1A] min-h-screen text-white">
      <h2 className="text-2xl font-bold mb-6">Individual Stock Analysis</h2>

      {/* Input Form */}
      <div className="mb-6 flex space-x-4">
        <div className="flex-1">
          <label className="block text-white mb-2">Stock Symbol (e.g., RELIANCE.BSE)</label>
          <input
            type="text"
            className="w-full p-2 bg-[#3D3D3D] text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Enter stock symbol"
          />
        </div>
        <div className="flex-1">
          <label className="block text-white mb-2">Time Period</label>
          <select
            className="w-full p-2 bg-[#3D3D3D] text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="1mo">1 Month</option>
            <option value="3mo">3 Months</option>
            <option value="6mo">6 Months</option>
            <option value="1y">1 Year</option>
          </select>
        </div>
        <button
          className="mt-6 bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
          onClick={handleAnalyze}
          disabled={loading || !symbol}
        >
          {loading ? 'Analyzing...' : 'Analyze Stock'}
        </button>
      </div>

      {/* Error Message */}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Analysis Results */}
      {analysisData && (
        <div>
          <h3 className="text-xl font-semibold mb-4">
            {analysisData.fundamentals?.Name || analysisData.metrics.Symbol} Analysis
          </h3>
          {analysisData.fundamentals && (
            <p className="text-gray-400 mb-4">
              {analysisData.fundamentals.Sector} - {analysisData.fundamentals.Industry}
            </p>
          )}
          <h4 className={`text-lg font-semibold ${signalColor(analysisData.metrics.Signal)} mb-4`}>
            Current Signal: {analysisData.metrics.Signal} (Strength: {analysisData.metrics['Signal Strength']})
          </h4>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex space-x-4 border-b border-[#3D3D3D]">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={`px-4 py-2 ${
                    activeTab === tab
                      ? 'text-white border-b-2 border-red-500'
                      : 'text-gray-300'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'Price Chart' && (
            <div className="mb-8">
              <Plot
                data={[
                  {
                    type: 'candlestick',
                    x: analysisData.chart_data.candlestick.x,
                    open: analysisData.chart_data.candlestick.open,
                    high: analysisData.chart_data.candlestick.high,
                    low: analysisData.chart_data.candlestick.low,
                    close: analysisData.chart_data.candlestick.close,
                    name: analysisData.metrics.Symbol,
                    increasing: { line: { color: '#00FF00' } },
                    decreasing: { line: { color: '#FF0000' } },
                  },
                  {
                    type: 'scatter',
                    x: analysisData.chart_data.candlestick.x,
                    y: analysisData.chart_data.candlestick.sma_20,
                    name: 'SMA 20',
                    line: { color: 'orange' },
                  },
                  {
                    type: 'scatter',
                    x: analysisData.chart_data.candlestick.x,
                    y: analysisData.chart_data.candlestick.sma_50,
                    name: 'SMA 50',
                    line: { color: 'blue' },
                  },
                  {
                    type: 'scatter',
                    x: analysisData.chart_data.candlestick.x,
                    y: analysisData.chart_data.candlestick.bb_upper,
                    name: 'BB Upper',
                    line: { color: 'rgba(250, 128, 114, 0.7)', dash: 'dash' },
                  },
                  {
                    type: 'scatter',
                    x: analysisData.chart_data.candlestick.x,
                    y: analysisData.chart_data.candlestick.bb_lower,
                    name: 'BB Lower',
                    line: { color: 'rgba(173, 216, 230, 0.7)', dash: 'dash' },
                    fill: 'tonexty',
                    fillcolor: 'rgba(173, 216, 230, 0.1)',
                  },
                  {
                    type: 'scatter',
                    x: analysisData.chart_data.candlestick.buy_signals,
                    y: analysisData.chart_data.candlestick.buy_prices,
                    mode: 'markers',
                    marker: { symbol: 'triangle-up', size: 12, color: 'green' },
                    name: 'Strong Buy Signal',
                  },
                  {
                    type: 'scatter',
                    x: analysisData.chart_data.candlestick.sell_signals,
                    y: analysisData.chart_data.candlestick.sell_prices,
                    mode: 'markers',
                    marker: { symbol: 'triangle-down', size: 12, color: 'red' },
                    name: 'Strong Sell Signal',
                  },
                ]}
                layout={{
                  title: `${analysisData.metrics.Symbol} Price Chart with Signals`,
                  xaxis: { title: 'Date' },
                  yaxis: { title: 'Price' },
                  plot_bgcolor: '#000000', // Set plot background to black
                  paper_bgcolor: '#000000', // Set paper background to black
                  font: { color: '#FFFFFF' }, // Ensure text is white for contrast
                  height: 600,
                  showlegend: true,
                  legend: { x: 1, y: 1, bgcolor: 'rgba(0, 0, 0, 0.5)' }, // Semi-transparent legend background
                }}
                useResizeHandler
                style={{ width: '100%' }}
              />
            </div>
          )}

          {activeTab === 'Technical Indicators' && (
            <div className="mb-8 flex space-x-4">
              <div className="flex-1">
                <Plot
                  data={[
                    {
                      type: 'scatter',
                      x: analysisData.chart_data.rsi.x,
                      y: analysisData.chart_data.rsi.rsi,
                      name: 'RSI',
                      line: { color: 'purple' },
                    },
                  ]}
                  layout={{
                    title: 'RSI Indicator',
                    xaxis: { title: 'Date' },
                    yaxis: { title: 'RSI', range: [0, 100] },
                    shapes: [
                      {
                        type: 'line',
                        x0: analysisData.chart_data.rsi.x[0],
                        x1: analysisData.chart_data.rsi.x[analysisData.chart_data.rsi.x.length - 1],
                        y0: 70,
                        y1: 70,
                        line: { color: 'red', width: 1, dash: 'dash' },
                      },
                      {
                        type: 'line',
                        x0: analysisData.chart_data.rsi.x[0],
                        x1: analysisData.chart_data.rsi.x[analysisData.chart_data.rsi.x.length - 1],
                        y0: 30,
                        y1: 30,
                        line: { color: 'green', width: 1, dash: 'dash' },
                      },
                    ],
                    plot_bgcolor: '#000000', // Set plot background to black
                    paper_bgcolor: '#000000', // Set paper background to black
                    font: { color: '#FFFFFF' }, // Ensure text is white for contrast
                    height: 250,
                  }}
                  useResizeHandler
                  style={{ width: '100%' }}
                />
              </div>
              <div className="flex-1">
                <Plot
                  data={[
                    {
                      type: 'scatter',
                      x: analysisData.chart_data.macd.x,
                      y: analysisData.chart_data.macd.macd,
                      name: 'MACD',
                      line: { color: 'blue' },
                    },
                    {
                      type: 'scatter',
                      x: analysisData.chart_data.macd.x,
                      y: analysisData.chart_data.macd.signal_line,
                      name: 'Signal Line',
                      line: { color: 'red' },
                    },
                    {
                      type: 'bar',
                      x: analysisData.chart_data.macd.x,
                      y: analysisData.chart_data.macd.histogram,
                      name: 'Histogram',
                      marker: { color: analysisData.chart_data.macd.histogram_colors },
                    },
                  ]}
                  layout={{
                    title: 'MACD Indicator',
                    xaxis: { title: 'Date' },
                    yaxis: { title: 'MACD' },
                    plot_bgcolor: '#000000', // Set plot background to black
                    paper_bgcolor: '#000000', // Set paper background to black
                    font: { color: '#FFFFFF' }, // Ensure text is white for contrast
                    height: 250,
                    showlegend: true,
                    legend: { x: 1, y: 1, bgcolor: 'rgba(0, 0, 0, 0.5)' }, // Semi-transparent legend background
                  }}
                  useResizeHandler
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'Signal Details' && (
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-4">Individual Signal Components</h4>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    name: 'RSI Signal',
                    value: analysisData.metrics['RSI Signal'],
                    details: `RSI = ${analysisData.metrics.RSI}`,
                  },
                  {
                    name: 'MACD Signal',
                    value: analysisData.metrics['MACD Signal'],
                    details: `MACD = ${analysisData.metrics.MACD}, Signal = ${analysisData.metrics['Signal Line']}`,
                  },
                  {
                    name: 'MA Crossover',
                    value: analysisData.metrics['MA Crossover Signal'],
                    details: `EMA9 vs EMA21: ${analysisData.metrics['EMA9 vs EMA21']}`,
                  },
                  {
                    name: 'Price-SMA Signal',
                    value: analysisData.metrics['Price-SMA Signal'],
                    details: `Above SMA20: ${analysisData.metrics['Above SMA20'] === 'True' ? 'Yes' : 'No'}, Above SMA50: ${analysisData.metrics['Above SMA50'] === 'True' ? 'Yes' : 'No'}`,
                  },
                  {
                    name: 'BB Signal',
                    value: analysisData.metrics['BB Signal'],
                    details: `BB Position: ${analysisData.metrics['BB Position']}`,
                  },
                  {
                    name: 'Volume Signal',
                    value: analysisData.metrics['Volume Signal'],
                    details: `Volume Ratio: ${analysisData.metrics['Volume Ratio']}`,
                  },
                ].map((signal, index) => (
                  <div key={index} className="bg-[#2D2D2D] p-4 rounded-lg">
                    <p className={`font-semibold ${signalColor(signal.value)}`}>
                      {signal.name}: {signal.value}
                    </p>
                    <p className="text-gray-400">{signal.details}</p>
                  </div>
                ))}
              </div>

              <h4 className="text-lg font-semibold mt-6 mb-4">Recent Signals (Last 10 Days)</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-[#2D2D2D] text-white">
                  <thead>
                    <tr>
                      <th className="py-3 px-6 text-left"></th>
                      <th className="py-3 px-6 text-left">RSI</th>
                      <th className="py-3 px-6 text-left">MACD</th>
                      <th className="py-3 px-6 text-left">MA Cross</th>
                      <th className="py-3 px-6 text-left">Bollinger</th>
                      <th className="py-3 px-6 text-left">Volume</th>
                      <th className="py-3 px-6 text-left">Signal</th>
                      <th className="py-3 px-6 text-left">Strength</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analysisData.chart_data.recent_signals).map(
                      ([date, signals], index) => (
                        <tr key={index} className="border-t border-[#3D3D3D]">
                          <td className="py-3 px-6">{date}</td>
                          <td className={`py-3 px-6 ${signalColor(signals.RSI)}`}>
                            {signals.RSI}
                          </td>
                          <td className={`py-3 px-6 ${signalColor(signals.MACD)}`}>
                            {signals.MACD}
                          </td>
                          <td
                            className={`py-3 px-6 ${signalColor(signals['MA Cross'])}`}
                          >
                            {signals['MA Cross']}
                          </td>
                          <td
                            className={`py-3 px-6 ${signalColor(signals.Bollinger)}`}
                          >
                            {signals.Bollinger}
                          </td>
                          <td
                            className={`py-3 px-6 ${signalColor(signals.Volume)}`}
                          >
                            {signals.Volume}
                          </td>
                          <td
                            className={`py-3 px-6 ${signalColor(signals.Signal)}`}
                          >
                            {signals.Signal}
                          </td>
                          <td className="py-3 px-6">{signals.Strength}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Historical Data' && (
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-4">Historical Data</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-[#2D2D2D] text-white">
                  <thead>
                    <tr>
                      <th className="py-3 px-6 text-left"></th>
                      <th className="py-3 px-6 text-left">Open</th>
                      <th className="py-3 px-6 text-left">High</th>
                      <th className="py-3 px-6 text-left">Low</th>
                      <th className="py-3 px-6 text-left">Close</th>
                      <th className="py-3 px-6 text-left">Volume</th>
                      <th className="py-3 px-6 text-left">Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analysisData.chart_data.historical_data).map(
                      ([date, data], index) => (
                        <tr key={index} className="border-t border-[#3D3D3D]">
                          <td className="py-3 px-6">{date}</td>
                          <td className="py-3 px-6">{data.Open.toFixed(2)}</td>
                          <td className="py-3 px-6">{data.High.toFixed(2)}</td>
                          <td className="py-3 px-6">{data.Low.toFixed(2)}</td>
                          <td className="py-3 px-6">{data.Close.toFixed(2)}</td>
                          <td className="py-3 px-6">{data.Volume}</td>
                          <td className={`py-3 px-6 ${signalColor(data.Signal)}`}>
                            {data.Signal}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Analyze;