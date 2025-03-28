import React, { createContext, useState, useContext } from 'react';

// Define the default ranges
const defaultRanges = {
  win_rate: { min: 0, max: 1 },
  risk_reward_ratio: { min: 0, max: Infinity },
  max_losing_streak: { min: 0, max: Infinity },
  sharpe_ratio: { min: -Infinity, max: Infinity },
  std_dev: { min: 0, max: Infinity },
  skewness: { min: -Infinity, max: Infinity },
  beta: { min: 0, max: 2 },
};  

// Create the context
const MarkerContext = createContext();

// Create a provider component
export const MarkerProvider = ({ children }) => {
  const [ranges, setRanges] = useState(defaultRanges);

  return (
    <MarkerContext.Provider value={{ ranges, setRanges }}>
      {children}
    </MarkerContext.Provider>
  );
};

// Custom hook to use the MarkerContext
export const useMarker = () => useContext(MarkerContext);