import React from 'react';
import { useMarker } from '../MarkerContext';
// Marker.jsx
const Marker = () => {
    const { ranges, setRanges } = useMarker();
  
    const handleRangeChange = (metric, type, value) => {
      setRanges((prevRanges) => ({
        ...prevRanges,
        [metric]: {
          ...prevRanges[metric],
          [type]: value === '' ? (type === 'min' ? -Infinity : Infinity) : parseFloat(value),
        },
      }));
    };
  
    const resetRanges = () => {
      setRanges({
        win_rate: { min: 0, max: 1 },
        risk_reward_ratio: { min: 0, max: Infinity },
        max_losing_streak: { min: 0, max: Infinity },
        sharpe_ratio: { min: -Infinity, max: Infinity },
        std_dev: { min: 0, max: Infinity },
        skewness: { min: -Infinity, max: Infinity },
        beta: { min: -Infinity, max: Infinity },
        
      });
    };
  
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-semibold text-white">Marker Settings</h2>
        <p className="text-gray-300">Set the ranges for each metric to highlight rows in the Run Backtest table.</p>
  
        <div className="space-y-4">
          {['win_rate', 'risk_reward_ratio', 'max_losing_streak', 'sharpe_ratio', 'std_dev', 'skewness','beta'].map((metric) => (
            <div key={metric} className="flex items-center space-x-4">
              <label className="w-32 text-gray-300 capitalize">{metric.replace('_', ' ')}</label>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Min:</span>
                <input
                  type="number"
                  step="0.01"
                  value={ranges[metric].min === -Infinity ? '' : ranges[metric].min}
                  onChange={(e) => handleRangeChange(metric, 'min', e.target.value)}
                  className="w-24 p-2 bg-[#2D2D2D] text-white rounded-lg border border-[#3D3D3D] focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={metric === 'win_rate' ? '0 to 1' : '-∞'}
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Max:</span>
                <input
                  type="number"
                  step="0.01"
                  value={ranges[metric].max === Infinity ? '' : ranges[metric].max}
                  onChange={(e) => handleRangeChange(metric, 'max', e.target.value)}
                  className="w-24 p-2 bg-[#2D2D2D] text-white rounded-lg border border-[#3D3D3D] focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={metric === 'win_rate' ? '0 to 1' : '∞'}
                />
              </div>
            </div>
          ))}
        </div>
  
        <button
          onClick={resetRanges}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Reset Ranges
        </button>
      </div>
    );
  };
  
  export default Marker;