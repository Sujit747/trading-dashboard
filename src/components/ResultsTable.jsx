import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useMarker } from '../MarkerContext';

const ResultsTable = ({ results, onFileClick }) => {
  const { ranges } = useMarker();

  const isWithinRanges = (result) => {
    const metrics = {
      win_rate: result.win_rate || 0,
      risk_reward_ratio: result.risk_reward_ratio || 0,
      max_losing_streak: result.max_losing_streak || 0,
      sharpe_ratio: result.sharpe_ratio || 0,
      std_dev: result.std_dev || 0,
      skewness: result.skewness || 0,
      beta: result.beta || 0,
    };

    return Object.keys(metrics).every((metric) => {
      const value = metrics[metric];
      const { min, max } = ranges[metric] || { min: -Infinity, max: Infinity };
      return value >= min && value <= max;
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-[#2D2D3D] text-white">
        <thead>
          <tr>
            <th className="py-3 px-6 text-left">Signal File</th>
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
          {results.map((result) => {
            const withinRanges = isWithinRanges(result);
            return (
              <tr
                key={result.id}
                onClick={() => onFileClick(result)}
                className={`border-t border-[#3D3D3D] cursor-pointer ${
                  withinRanges ? 'bg-green-500' : 'bg-red-500'
                } hover:bg-opacity-80 transition-colors`}
              >
                <td className="py-3 px-6 flex items-center">
                  <ChevronRight className="w-5 h-5 mr-2" />
                  {result.filename}
                </td>
                <td className="py-3 px-6">{result.win_rate ? (result.win_rate * 100).toFixed(2) + '%' : 'N/A'}</td>
                <td className="py-3 px-6">{result.risk_reward_ratio ? result.risk_reward_ratio.toFixed(2) : 'N/A'}</td>
                <td className="py-3 px-6">{result.max_losing_streak || '0'}</td>
                <td className="py-3 px-6">{result.sharpe_ratio ? result.sharpe_ratio.toFixed(2) : 'N/A'}</td>
                <td className="py-3 px-6">{result.std_dev ? result.std_dev.toFixed(2) : 'N/A'}</td>
                <td className="py-3 px-6">{result.skewness ? result.skewness.toFixed(2) : 'N/A'}</td>
                <td className="py-3 px-6">{result.beta ? result.beta.toFixed(2) : 'N/A'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;