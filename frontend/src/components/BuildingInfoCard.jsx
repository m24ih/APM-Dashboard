import React from 'react';

export default function BuildingInfoCard({ info }) {
  return (
    <div className="bg-[#161c2d] p-4 rounded-xl border border-slate-800 h-full flex flex-col justify-center">
      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">BUILDING METADATA</p>
      <p className="text-sm font-bold text-white my-0.5 truncate">
        ID: {info ? info.building_id : 'Loading...'}
      </p>
      <p className="text-[11px] text-slate-400">
        Type: {info ? `${info.primaryspaceusage} (${info.sqm_sqft} sqft)` : 'Awaiting data...'}
      </p>
    </div>
  );
}