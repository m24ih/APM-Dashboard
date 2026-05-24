import React, { useState, useEffect } from 'react';
import AtmosphereChart from './components/AtmosphereChart';
import PrecipitationChart from './components/PrecipitationChart';
import ThermalChart from './components/ThermalChart';
import EnergyChart from './components/EnergyChart';
import BuildingInfoCard from './components/BuildingInfoCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [buildingInfo, setBuildingInfo] = useState(null);
  const [streamData, setStreamData] = useState([]);
  const [latestMetrics, setLatestMetrics] = useState(null);

  useEffect(() => {
    fetch('/api/static')
      .then(res => res.json())
      .then(data => setBuildingInfo(data))
      .catch(err => console.error("Error loading static metadata:", err));
  }, []);

  useEffect(() => {
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      try {
        const parsedRecord = JSON.parse(event.data);
        if (parsedRecord.error) return;

        setLatestMetrics(parsedRecord);

        setStreamData((prevData) => {
          const updated = [...prevData, parsedRecord];
          if (updated.length > 20) {
            return updated.slice(updated.length - 20);
          }
          return updated;
        });
      } catch (error) {
        console.error("Error parsing stream chunk:", error);
      }
    };

    return () => eventSource.close();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f131e] p-6 text-slate-100 font-sans">
      
      {/* BAŞLIK ALANI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-indigo-400">Dashboard</h1>
          <p className="text-xs text-slate-400">Real-Time Carbon Tracking Smart Building System</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h3 className="text-xs font-bold">Admin</h3>
            <p className="text-[10px] text-indigo-400">System Administrator</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500 flex items-center justify-center text-xs font-bold text-indigo-300">
            AD
          </div>
        </div>
      </div>

      {/* ÜST KPI METRİKLERİ VE BİNA KARTI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#161c2d] p-4 rounded-xl border border-slate-800 flex flex-col justify-center min-h-[100px]">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">CARBON EMISSION (CO₂kg)</p>
          <p className="text-2xl font-extrabold text-white my-1">
            {latestMetrics?.carbon_emission_kg != null ? `${latestMetrics.carbon_emission_kg.toFixed(2)} kg` : 'Streaming...'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-400">ISO 14064-1 COMPLIANT</span>
          </div>
        </div>

        <div className="bg-[#161c2d] p-4 rounded-xl border border-slate-800 flex flex-col justify-center min-h-[100px]">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ENERGY CONSUMPTION (kWh)</p>
          <p className="text-2xl font-extrabold text-white my-1">
            {latestMetrics?.meter_reading != null ? `${latestMetrics.meter_reading.toFixed(2)} kWh` : 'Streaming...'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-amber-400">LIVE CORRELATION ACTIVE</span>
          </div>
        </div>

        <BuildingInfoCard info={buildingInfo} />
      </div>

      {/* ORTA PANEL: TÜM GRAFİKLER BURADA EŞİT BOYUTTA LİSTELENİYOR */}
      {/* grid-cols-1 (Mobilde alt alta), lg:grid-cols-2 (Masaüstünde iki sütun) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Sol Sütun Elemanları */}
        <div className="flex flex-col gap-6">
          <ThermalChart data={streamData} />
          <EnergyChart data={streamData} />
        </div>
        
        {/* Sağ Sütun Elemanları */}
        <div className="flex flex-col gap-6">
          <AtmosphereChart data={streamData} latest={latestMetrics} />
          <PrecipitationChart data={streamData} latest={latestMetrics} />
        </div>

      </div>

      {/* ALT PANEL: ZAMAN SERİSİ KARBON TRENDİ */}
      <div className="w-full bg-[#161c2d] p-4 rounded-xl border border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Time-Series Stream Analysis</h3>
            <p className="text-sm font-semibold text-white">Carbon Emissions Historical Trend</p>
          </div>
          <div className="flex gap-1 bg-[#0f131e] p-1 rounded-md text-[9px] font-bold border border-slate-800">
            <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded border border-indigo-500/30 animate-pulse">Live Streaming Active</span>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={streamData}>
              <defs>
                <linearGradient id="colorEmission" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#242f47" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={9} tickFormatter={(t) => t ? t.split(' ')[1] : ''} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
              <Area type="linear" isAnimationActive={false} dataKey="carbon_emission_kg" stroke="#818cf8" fillOpacity={1} fill="url(#colorEmission)" name="CO₂ (kg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
    </div>
  );
}