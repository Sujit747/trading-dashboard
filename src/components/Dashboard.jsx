import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ResultsTable from './ResultsTable';

const Dashboard = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5001/api/backtest-results', {
          timeout: 60000, // 60 seconds timeout
        });
        // Sort results by ID in descending order (latest first)
        const sortedResults = response.data.sort((a, b) => b.id - a.id);
        setResults(sortedResults);
        setLoading(false);
      } catch (err) {
        if (err.code === 'ECONNABORTED') {
          setError('Request timed out. Please try again.');
        } else if (err.response) {
          setError(`Failed to fetch results: ${err.response.status} - ${err.response.data.error || 'Unknown error'}`);
        } else if (err.request) {
          setError('Failed to fetch results: No response received from the server. Please check your network connection.');
        } else {
          setError(`Failed to fetch results: ${err.message}`);
        }
        setLoading(false);
        console.error('Error fetching backtest results:', err);
      }
    };

    fetchResults();
  }, []);

  const handleFileClick = (result) => {
    // Navigate to the CompanySpecificMetrics screen with the signal file ID
    navigate(`/backtest/company-metrics/${result.signal_file_id}`);
  };

  return (
    <div className="bg-[#1A1A1A] text-white p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <button
          onClick={() => navigate('/backtest/upload')}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
        >
          Upload New Signal File
        </button>
      </div>

      {loading && <p>Loading results...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {results.length > 0 && !loading && !error ? (
        <ResultsTable results={results} onFileClick={handleFileClick} />
      ) : (
        !loading && !error && <p className="text-red-500">No signal files found.</p>
      )}
    </div>
  );
};

export default Dashboard;