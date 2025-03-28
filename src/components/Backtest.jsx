import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Backtest() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the Dashboard screen immediately
    navigate('/backtest/dashboard');
  }, [navigate]);

  return null; // No UI needed since we're redirecting
}

export default Backtest;