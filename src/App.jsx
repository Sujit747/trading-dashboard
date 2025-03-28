import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Outlet } from 'react-router-dom';
import Screener from './components/Screener';
import Backtest from './components/Backtest';
import Analyze from './components/Analyze';
import EntryScreener from './components/EntryScreener';
import ExitScreener from './components/ExitScreener';
import GenerateSignals from './components/GenerateSignals';
import Dashboard from './components/Dashboard'; // New Dashboard component
import UploadSignalFile from './components/UploadSignalFile'; // New UploadSignalFile component
import CompanySpecificMetrics from './components/CompanySpecificMetrics'; // Renamed from CompanyMetrics
import Marker from './components/Marker';
import { MarkerProvider } from './MarkerContext';
import { FileText, PlayCircle, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';

// Sidebar Component
const Sidebar = () => {
  const location = useLocation();
  const [isScreenerOpen, setIsScreenerOpen] = useState(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);

  const toggleScreenerMenu = () => {
    setIsScreenerOpen(!isScreenerOpen);
  };

  const toggleBacktestMenu = () => {
    setIsBacktestOpen(!isBacktestOpen);
  };

  return (
    <div className="w-64 bg-[#2D2D2D] p-6 flex flex-col">
      <h1 className="text-2xl font-bold mb-8">Trading Dashboard</h1>

      {/* Sidebar Menu */}
      <nav className="flex-1">
        <ul>
          {/* Screener Menu with Dropdown */}
          <li className="mb-4">
            <button
              className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-left ${
                location.pathname.startsWith('/screener')
                  ? 'bg-red-500 text-white'
                  : 'text-gray-300 hover:bg-[#3D3D3D]'
              } transition-colors`}
              onClick={toggleScreenerMenu}
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5" />
                <span>Screener</span>
              </div>
              {isScreenerOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {isScreenerOpen && (
              <ul className="mt-2 pl-8">
                <li>
                  <Link
                    to="/screener/entry"
                    className={`block py-2 px-4 rounded-lg ${
                      location.pathname === '/screener/entry'
                        ? 'bg-[#3D3D3D] text-white'
                        : 'text-gray-300 hover:bg-[#3D3D3D] hover:text-white'
                    }`}
                    onClick={() => setIsScreenerOpen(true)}
                  >
                    Entry Screener
                  </Link>
                </li>
                <li>
                  <Link
                    to="/screener/exit"
                    className={`block py-2 px-4 rounded-lg ${
                      location.pathname === '/screener/exit'
                        ? 'bg-[#3D3D3D] text-white'
                        : 'text-gray-300 hover:bg-[#3D3D3D] hover:text-white'
                    }`}
                    onClick={() => setIsScreenerOpen(true)}
                  >
                    Exit Screener
                  </Link>
                </li>
                <li>
                  <Link
                    to="/screener/generate-signals"
                    className={`block py-2 px-4 rounded-lg ${
                      location.pathname === '/screener/generate-signals'
                        ? 'bg-[#3D3D3D] text-white'
                        : 'text-gray-300 hover:bg-[#3D3D3D] hover:text-white'
                    }`}
                    onClick={() => setIsScreenerOpen(true)}
                  >
                    Generate Signals
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Backtest Menu with Dropdown */}
          <li className="mb-4">
            <button
              className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-left ${
                location.pathname.startsWith('/backtest')
                  ? 'bg-red-500 text-white'
                  : 'text-gray-300 hover:bg-[#3D3D3D]'
              } transition-colors`}
              onClick={toggleBacktestMenu}
            >
              <div className="flex items-center space-x-3">
                <PlayCircle className="w-5 h-5" />
                <span>Backtest</span>
              </div>
              {isBacktestOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {isBacktestOpen && (
              <ul className="mt-2 pl-8">
                <li>
                  <Link
                    to="/backtest/dashboard"
                    className={`block py-2 px-4 rounded-lg ${
                      location.pathname === '/backtest/dashboard'
                        ? 'bg-[#3D3D3D] text-white'
                        : 'text-gray-300 hover:bg-[#3D3D3D] hover:text-white'
                    }`}
                    onClick={() => setIsBacktestOpen(true)}
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/backtest/upload"
                    className={`block py-2 px-4 rounded-lg ${
                      location.pathname === '/backtest/upload'
                        ? 'bg-[#3D3D3D] text-white'
                        : 'text-gray-300 hover:bg-[#3D3D3D] hover:text-white'
                    }`}
                    onClick={() => setIsBacktestOpen(true)}
                  >
                    Run Backtest
                  </Link>
                </li>
                <li>
                  <Link
                    to="/backtest/marker"
                    className={`block py-2 px-4 rounded-lg ${
                      location.pathname === '/backtest/marker'
                        ? 'bg-[#3D3D3D] text-white'
                        : 'text-gray-300 hover:bg-[#3D3D3D] hover:text-white'
                    }`}
                    onClick={() => setIsBacktestOpen(true)}
                  >
                    Tolerance Levels
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Analyze */}
          <li className="mb-4">
            <Link
              to="/analyze"
              className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-left ${
                location.pathname === '/analyze'
                  ? 'bg-red-500 text-white'
                  : 'text-gray-300 hover:bg-[#3D3D3D]'
              } transition-colors`}
            >
              <BarChart2 className="w-5 h-5" />
              <span>Analyze</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

const App = () => {
  return (
    <MarkerProvider>
      <Router>
        <div className="min-h-screen bg-[#1A1A1A] text-white flex">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 p-6">
            <Routes>
              <Route path="/screener" element={<Screener />}>
                <Route path="entry" element={<EntryScreener />} />
                <Route path="exit" element={<ExitScreener />} />
                <Route path="generate-signals" element={<GenerateSignals />} />
                <Route index element={<div><h2 className="text-2xl font-bold">Stock Screener</h2><p className="text-gray-300">Select a sub-menu to proceed.</p></div>} />
              </Route>
              <Route path="/backtest" element={<div><h2 className="text-2xl font-bold">Backtest</h2><Outlet /></div>}>
                <Route index element={<p className="text-gray-300">Select a sub-menu to proceed.</p>} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="upload" element={<UploadSignalFile />} />
                <Route path="company-metrics/:signalFileId" element={<CompanySpecificMetrics />} />
                <Route path="run" element={<Backtest />} />
                <Route path="marker" element={<Marker />} />
              </Route>
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/" element={<div><h2 className="text-2xl font-bold">Welcome to Trading Dashboard</h2></div>} />
            </Routes>
          </div>
        </div>
      </Router>
    </MarkerProvider>
  );
};

export default App;