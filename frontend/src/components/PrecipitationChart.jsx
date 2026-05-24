import React from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

const CustomDot = (props) => {
  const { cx, cy, payload, dataKey } = props;
  if (payload[dataKey] === -1) return <circle cx={cx} cy={cy} r={4} fill="#f59e0b" stroke="#f59e0b" />;
  return null;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1e293b] border-none rounded-lg p-3 text-slate-200 text-xs shadow-lg">
        <p className="mb-2 text-slate-400 font-bold">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="my-1">
            {p.name}: {p.value === -1 ? <span className="text-amber-500">trace amount</span> : `${p.value} mm`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function PrecipitationChart({ data }) {
  const processedData = data?.map(d => ({
    time: d.timestamp ? d.timestamp.slice(5, 13) : "",
    cloudCoverage: d.cloudCoverage,
    precip1HR: d.precipDepth1HR,
    precip6HR: d.precipDepth6HR,
    precip1HR_display: d.precipDepth1HR === -1 ? 0 : d.precipDepth1HR,
    precip6HR_display: d.precipDepth6HR === -1 ? 0 : d.precipDepth6HR,
  })) || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#161c2d] p-6 rounded-xl border border-slate-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Precipitation Amount</h2>
        <p className="text-xs text-slate-500 mb-4"><span className="text-amber-500">●</span> Yellow dots = trace amount</p>
        {processedData.length === 0 ? (
          <p className="text-slate-400 text-center p-10 animate-pulse">Waiting for data...</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#242f47" />
              <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8" }} label={{ value: "mm", angle: -90, position: "insideLeft", fill: "#94a3b8" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: "#e2e8f0" }} />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
              <Line type="linear" isAnimationActive={false} dataKey="precip1HR_display" stroke="#38bdf8" dot={<CustomDot dataKey="precip1HR" />} name="1 Hour (mm)" strokeWidth={2} />
              <Line type="linear" isAnimationActive={false} dataKey="precip6HR_display" stroke="#a78bfa" dot={<CustomDot dataKey="precip6HR" />} name="6 Hour (mm)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-[#161c2d] p-6 rounded-xl border border-slate-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Cloud Coverage</h2>
        {processedData.length === 0 ? (
          <p className="text-slate-400 text-center p-10 animate-pulse">Waiting for data...</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#242f47" />
              <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis domain={[0, 9]} tick={{ fill: "#94a3b8" }} label={{ value: "okta", angle: -90, position: "insideLeft", fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: "8px", color: "#e2e8f0" }} />
              <Legend wrapperStyle={{ color: "#e2e8f0" }} />
              <Line type="linear" isAnimationActive={false} dataKey="cloudCoverage" stroke="#4ade80" dot={false} name="Coverage (okta)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}