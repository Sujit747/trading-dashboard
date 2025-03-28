import React, { useState } from 'react';

const ExitScreener = () => {
  const [exitQuery, setExitQuery] = useState('');

  const handleGenerateExitSignals = () => {
    console.log('Exit Query:', exitQuery);
    // Add logic to generate exit signals (e.g., call an API)
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Exit Screener</h3>
      <textarea
        className="w-full h-32 p-4 bg-[#3D3D3D] text-gray-300 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        placeholder="Enter your exit screener query..."
        value={exitQuery}
        onChange={(e) => setExitQuery(e.target.value)}
      />
      <button
        className="mt-4 bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
        onClick={handleGenerateExitSignals}
      >
        Generate Exit Stocks
      </button>
    </div>
  );
};

export default ExitScreener;