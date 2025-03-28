import React, { useState } from 'react';

const GenerateSignals = () => {
  const [entryFile, setEntryFile] = useState(null);
  const [exitFile, setExitFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleEntryFileChange = (e) => {
    setEntryFile(e.target.files[0]);
  };

  const handleExitFileChange = (e) => {
    setExitFile(e.target.files[0]);
  };

  const handleGenerateSignals = async () => {
    if (!entryFile || !exitFile) {
      setMessage('Please upload both entry and exit stock files.');
      return;
    }

    const formData = new FormData();
    formData.append('entryFile', entryFile);
    formData.append('exitFile', exitFile);

    try {
      // Replace with your actual backend API endpoint
      const response = await fetch('http://localhost:5001/api/screener/generate-signals', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setMessage('Signals generated successfully!');
        console.log('Generated Signals:', result);
        // Optionally display the results in the UI
      } else {
        setMessage(`Error: ${result.error || 'Failed to generate signals.'}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Generate Signals</h3>
      <div className="mb-4">
        <label className="block text-gray-300 mb-2">Upload Entry Stocks File</label>
        <input
          type="file"
          accept=".csv,.txt,.json" // Adjust accepted file types as needed
          onChange={handleEntryFileChange}
          className="w-full p-2 bg-[#3D3D3D] text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-300 mb-2">Upload Exit Stocks File</label>
        <input
          type="file"
          accept=".csv,.txt,.json" // Adjust accepted file types as needed
          onChange={handleExitFileChange}
          className="w-full p-2 bg-[#3D3D3D] text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
      <button
        className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
        onClick={handleGenerateSignals}
      >
        Generate Signals
      </button>
      {message && (
        <div className="mt-4">
          <p className={`text-sm ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

export default GenerateSignals;