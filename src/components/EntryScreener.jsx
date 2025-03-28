import React, { useState } from 'react';

const EntryScreener = () => {
  const [entryQuery, setEntryQuery] = useState('');

  const handleGenerateEntrySignals = () => {
    console.log('Entry Query:', entryQuery);
    // Add logic to generate entry signals (e.g., call an API)
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-2">Entry Screener</h3>
      <textarea
        className="w-full h-32 p-4 bg-[#3D3D3D] text-gray-300 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        placeholder="Enter your entry screener query..."
        value={entryQuery}
        onChange={(e) => setEntryQuery(e.target.value)}
      />
      <button
        className="mt-4 bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
        onClick={handleGenerateEntrySignals}
      >
        Generate Entry Stocks
      </button>
    </div>
  );
};

export default EntryScreener;