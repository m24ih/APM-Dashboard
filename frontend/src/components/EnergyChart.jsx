import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function EnergyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#161c2d] p-4 rounded-xl border border-slate-800 h-full min-h-[300px] flex items-center justify-center">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider animate-pulse">Awaiting energy data...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#161c2d] p-4 rounded-xl border border-slate-800 flex flex-col h-full min-h-[300px]">
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Energy Analysis</h3>
        <p className="text-sm font-semibold text-white">Real-Time Energy Consumption</p>
      </div>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#242f47" vertical={false} />
            <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={10} tickFormatter={(t) => t ? t.split(' ')[1] : ''} />
            <YAxis stroke="#a3e635" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="meter_reading" fill="#a3e635" name="Energy (kWh)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}