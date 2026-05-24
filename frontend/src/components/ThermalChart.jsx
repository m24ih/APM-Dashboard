import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ThermalChart({ data }) {
  // Veri akışı henüz başlamadıysa şık bir bekleme ekranı gösteriyoruz
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#161c2d] p-4 rounded-xl border border-slate-800 h-full min-h-[300px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Awaiting thermal data stream...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#161c2d] p-4 rounded-xl border border-slate-800 flex flex-col h-full min-h-[300px]">
      {/* BAŞLIK ALANI */}
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Thermal External Factors</h3>
        <p className="text-sm font-semibold text-white">Air Temperature vs. Dew Point Correlation</p>
      </div>
      
      {/* GRAFİK ALANI */}
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#242f47" vertical={false} />
            
            {/* Alt Zaman Eksenimiz */}
            <XAxis 
              dataKey="timestamp" 
              stroke="#94a3b8" 
              fontSize={10} 
              tickFormatter={(t) => t ? t.split(' ')[1] : ''} 
            />
            <YAxis stroke="#94a3b8" fontSize={10} />
            
            {/* Üzerine gelince açılan bilgi kutusu */}
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px' }} 
              itemStyle={{ fontWeight: 'bold' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            
            {/* DIŞ HAVA SICAKLIĞI ÇİZGİSİ (Sıcak/Turuncu Ton) */}
            <Line 
              type="monotone" 
              dataKey="airTemperature" 
              name="Air Temp (°C)" 
              stroke="#f97316" 
              strokeWidth={2.5} 
              dot={false} 
              activeDot={{ r: 5, fill: "#f97316", stroke: "#fff" }} 
            />
            
            {/* ÇİY NOKTASI ÇİZGİSİ (Soğuk/Mavi Ton) */}
            <Line 
              type="monotone" 
              dataKey="dewTemperature" 
              name="Dew Point (°C)" 
              stroke="#38bdf8" 
              strokeWidth={2.5} 
              dot={false} 
              activeDot={{ r: 5, fill: "#38bdf8", stroke: "#fff" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}