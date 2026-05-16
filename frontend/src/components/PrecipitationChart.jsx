import { useEffect, useState } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

const CustomDot = (props) => {
  const { cx, cy, payload, dataKey } = props;
  if (payload[dataKey] === -1) {
    return <circle cx={cx} cy={cy} r={4} fill="#f59e0b" stroke="#f59e0b" />;
  }
  return null;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#0f172a", border: "1px solid #334155",
        padding: "10px", borderRadius: 8, color: "#e2e8f0", fontSize: 12
      }}>
        <p style={{ marginBottom: 6, color: "#94a3b8" }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, margin: "2px 0" }}>
            {p.name}: {p.value === -1
              ? <span style={{ color: "#f59e0b" }}>iz miktarı (trace)</span>
              : `${p.value} mm`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function PrecipitationChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:8000/api/stream");

    eventSource.onmessage = (event) => {
      const d = JSON.parse(event.data);
      if (d.error) return;

      setData((prev) => {
        const newPoint = {
          time: d.timestamp ? d.timestamp.slice(5, 13) : "",
          cloudCoverage: d.cloudCoverage,
          precip1HR: d.precipDepth1HR,
          precip6HR: d.precipDepth6HR,
          precip1HR_display: d.precipDepth1HR === -1 ? 0 : d.precipDepth1HR,
          precip6HR_display: d.precipDepth6HR === -1 ? 0 : d.precipDepth6HR,
          isTrace1HR: d.precipDepth1HR === -1,
          isTrace6HR: d.precipDepth6HR === -1,
        };
        return [...prev, newPoint].slice(-60);
      });
    };

    return () => eventSource.close();
  }, []);

  return (
    <div style={{ display: "grid", gap: 24 }}>

      {/* YAGIS GRAFİGİ */}
      <div style={{ background: "#1e293b", padding: 24, borderRadius: 12 }}>
        <h2 style={{ color: "#e2e8f0", marginBottom: 8 }}>
          🌧️ Yağış Miktarı (Gerçek Zamanlı)
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 16 }}>
          <span style={{ color: "#f59e0b" }}>●</span> Sarı işaretler iz miktarını (trace, -1) temsil eder
        </p>
        {data.length === 0 ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>⏳ Veri bekleniyor...</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }}
                interval={Math.floor(data.length / 8)} />
              <YAxis tick={{ fill: "#94a3b8" }}
                label={{ value: "mm", angle: -90, position: "insideLeft", fill: "#94a3b8" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: "#e2e8f0" }} />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="precip1HR_display" stroke="#38bdf8"
                dot={<CustomDot dataKey="precip1HR" />}
                name="1 Saatlik Yağış (mm)" strokeWidth={2} />
              <Line type="monotone" dataKey="precip6HR_display" stroke="#a78bfa"
                dot={<CustomDot dataKey="precip6HR" />}
                name="6 Saatlik Yağış (mm)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* BULUTLULUK GRAFİGİ */}
      <div style={{ background: "#1e293b", padding: 24, borderRadius: 12 }}>
        <h2 style={{ color: "#e2e8f0", marginBottom: 16 }}>
          ☁️ Bulut Örtüsü (Gerçek Zamanlı)
        </h2>
        {data.length === 0 ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>⏳ Veri bekleniyor...</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }}
                interval={Math.floor(data.length / 8)} />
              <YAxis domain={[0, 9]} tick={{ fill: "#94a3b8" }}
                label={{ value: "okta", angle: -90, position: "insideLeft", fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }} />
              <Legend wrapperStyle={{ color: "#e2e8f0" }} />
              <Line type="monotone" dataKey="cloudCoverage" stroke="#4ade80"
                dot={false} name="Bulut Örtüsü (okta)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}