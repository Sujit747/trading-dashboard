import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const CompanySpecificMetrics = () => {
  const { signalFileId } = useParams(); // Get signalFileId from URL
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!signalFileId) {
      setLoading(false);
      setError('Please select a signal file from the Dashboard.');
      return;
    }

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/signal-files/${signalFileId}`, {
          timeout: 120000,
        });
        const formattedMetrics = Object.entries(response.data).map(([ticker, data]) => ({
          ticker,
          ...data,
        }));
        setMetrics(formattedMetrics);
        setLoading(false);
      } catch (err) {
        if (err.code === 'ECONNABORTED') {
          setError('Request timed out. Processing large signal files may take longer. Please try again or use a smaller file.');
        } else if (err.response) {
          setError(`Failed to fetch company metrics: ${err.response.status} - ${err.response.data.error || 'Unknown error'}`);
        } else if (err.request) {
          setError('Failed to fetch company metrics: No response received from the server. Please check your network connection.');
        } else {
          setError(`Failed to fetch company metrics: ${err.message}`);
        }
        setLoading(false);
        console.error('Error fetching company metrics:', err);
      }
    };

    fetchMetrics();
  }, [signalFileId]);

  return (
    <div className="bg-[#1A1A1A] text-white p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Company Metrics</h2>
        <button
          onClick={() => navigate('/backtest/dashboard')} // Navigate back to the new Dashboard
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      {loading && <p>Loading company metrics... (This may take a moment for larger files)</p>}
      {error && <p className="text-red-500">{error}</p>}
      {metrics.length > 0 && !loading && !error ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-[#2D2D2D] text-white rounded-lg">
            <thead>
              <tr>
                <th className="py-3 px-6 text-left">Ticker</th>
                <th className="py-3 px-6 text-left">Win Rate</th>
                <th className="py-3 px-6 text-left">Risk/Reward</th>
                <th className="py-3 px-6 text-left">Max Losing Streak</th>
                <th className="py-3 px-6 text-left">Sharpe Ratio</th>
                <th className="py-3 px-6 text-left">Std Dev</th>
                <th className="py-3 px-6 text-left">Skewness</th>
                <th className="py-3 px-6 text-left">Beta</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((data) => (
                <tr key={data.ticker} className="border-t border-[#3D3D3D]">
                  <td className="py-3 px-6">{data.ticker}</td>
                  <td className="py-3 px-6">{data.win_rate ? (data.win_rate * 100).toFixed(2) + '%' : 'N/A'}</td>
                  <td className="py-3 px-6">{data.risk_reward_ratio ? data.risk_reward_ratio.toFixed(2) : 'N/A'}</td>
                  <td className="py-3 px-6">{data.max_losing_streak || '0'}</td>
                  <td className="py-3 px-6">{data.sharpe_ratio ? data.sharpe_ratio.toFixed(2) : 'N/A'}</td>
                  <td className="py-3 px-6">{data.std_dev ? data.std_dev.toFixed(2) : 'N/A'}</td>
                  <td className="py-3 px-6">{data.skewness ? data.skewness.toFixed(2) : 'N/A'}</td>
                  <td className="py-3 px-6">{typeof data.beta === 'number' ? data.beta.toFixed(2) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && !error && <p className="text-red-500">No valid data found for any ticker.</p>
      )}
    </div>
  );
};

export default CompanySpecificMetrics;