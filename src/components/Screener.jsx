import React from 'react';
import { Outlet } from 'react-router-dom';

const Screener = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Stock Screener</h2>
      <Outlet /> {/* Renders the nested routes (EntryScreener or ExitScreener yes) */}
    </div>
  );
};

export default Screener;