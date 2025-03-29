import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function UploadSignalFile() {
  const [selectedFile, setSelectedFile] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;

      try {
        // Send the signal file to the backend to run the backtest
        await axios.post(`${import.meta.env.VITE_API_URL}/api/signal-files`, {
            filename: selectedFile.name,
            content: text,
          });

        // Redirect to the Dashboard screen to see the updated results
        navigate('/backtest/dashboard');
      } catch (error) {
        console.error('Error during backtest generation:', error);
        alert('Failed to generate signals. Please try again.');
      }
    };
    reader.readAsText(selectedFile);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold text-white">Upload Signal File</h2>

      <div className="space-y-4">
        <div className="border-2 border-dashed border-[#2D2D2D] rounded-lg p-8 text-center bg-[#262730]">
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            accept=".csv"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center space-y-2"
          >
            <Upload size={40} className="text-gray-400" />
            <span className="text-gray-300">
              {selectedFile ? selectedFile.name : 'Upload signal file'}
            </span>
          </label>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!selectedFile}
          className={`w-full px-4 py-2 rounded-lg transition-colors ${
            selectedFile
              ? 'bg-[#FF4B4B] text-white hover:bg-[#FF4B4B]/90'
              : 'bg-[#2D2D2D] text-gray-400 cursor-not-allowed'
          }`}
        >
          Generate Results
        </button>
      </div>
    </div>
  );
}

export default UploadSignalFile;