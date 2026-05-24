import React, { useState, useEffect } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";

const DIRECTIONS = ["N (0)", "NE (45)", "E (90)", "SE (135)", "S (180)", "SW (225)", "W (270)", "NW (315)"];
function degToDir(deg) { return DIRECTIONS[Math.round(deg / 45) % 8]; }

export default function AtmosphereChart({ data, latest }) {
  const [roseData, setRoseData] = useState([]);

  useEffect(() => {
    if (!data || data.length === 0) return;
    
    const roseCounts = {};
    DIRECTIONS.forEach(d => { roseCounts[d] = { total: 0, count: 0 }; });

    data.forEach(d => {
      if (d.windDirection != null && d.windSpeed != null) {
        const dir = degToDir(d.windDirection);
        roseCounts[dir].total += d.windSpeed;
        roseCounts[dir].count += 1;
      }
    });

    const formatted = DIRECTIONS.map(dir => ({
      direction: dir,
      avgSpeed: roseCounts[dir].count > 0 ? parseFloat((roseCounts[dir].total / roseCounts[dir].count).toFixed(2)) : 0,
    }));
    setRoseData(formatted);
  }, [data]);

  const timeData = data?.map(d => ({
    time: d.timestamp ? d.timestamp.slice(5, 13) : "",
    pressure: d.seaLvlPressure,
    windSpeed: d.windSpeed
  })) || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#161c2d] p-6 rounded-xl border border-slate-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Atmospheric Pressure and Wind Speed</h2>
        {timeData.length === 0 ? (
          <p className="text-slate-400 text-center p-10 animate-pulse">Waiting for data...</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#242f47" />
              <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: "#38bdf8" }} label={{ value: "hPa", angle: -90, position: "insideLeft", fill: "#38bdf8" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#4ade80" }} label={{ value: "m/s", angle: 90, position: "insideRight", fill: "#4ade80" }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: "8px", color: "#e2e8f0" }} />
              <Legend wrapperStyle={{ color: "#e2e8f0" }} />
              <Line yAxisId="left" type="linear" isAnimationActive={false} dataKey="pressure" stroke="#38bdf8" dot={false} name="Sea Level Pressure (hPa)" />
              <Line yAxisId="right" type="linear" isAnimationActive={false} dataKey="windSpeed" stroke="#4ade80" dot={false} name="Wind Speed (m/s)" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-[#161c2d] p-6 rounded-xl border border-slate-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Wind Rose - Average Speed</h2>
        {latest && (
          <p className="text-xs text-slate-400 mb-4">
            Direction: <strong className="text-pink-400">{latest.windDirection}°</strong> | Speed: <strong className="text-emerald-400">{latest.windSpeed} m/s</strong>
          </p>
        )}
        {roseData.length === 0 ? (
          <p className="text-slate-400 text-center p-10 animate-pulse">Waiting for data...</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={roseData}>
              <PolarGrid stroke="#242f47" />
              <PolarAngleAxis dataKey="direction" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Radar name="Avg. Wind Speed (m/s)" dataKey="avgSpeed" stroke="#f472b6" fill="#f472b6" fillOpacity={0.5} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: "8px", color: "#e2e8f0" }} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}