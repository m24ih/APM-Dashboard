import { useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

const DIRECTIONS = [
  "N (0)",
  "NE (45)",
  "E (90)",
  "SE (135)",
  "S (180)",
  "SW (225)",
  "W (270)",
  "NW (315)",
];

function degToDir(deg) {
  const idx = Math.round(deg / 45) % 8;
  return DIRECTIONS[idx];
}

export default function AtmosphereChart() {
  const [timeData, setTimeData] = useState([]);
  const [roseData, setRoseData] = useState([]);
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:8000/api/stream");
    const roseCounts = {};
    DIRECTIONS.forEach((d) => {
      roseCounts[d] = { total: 0, count: 0 };
    });

    eventSource.onmessage = (event) => {
      const d = JSON.parse(event.data);
      if (d.error) return;

      setLatest(d);

      setTimeData((prev) => {
        const newPoint = {
          time: d.timestamp ? d.timestamp.slice(5, 13) : "",
          pressure: d.seaLvlPressure,
          windSpeed: d.windSpeed,
        };
        const updated = [...prev, newPoint];
        return updated.slice(-60);
      });

      if (d.windDirection != null && d.windSpeed != null) {
        const dir = degToDir(d.windDirection);
        roseCounts[dir].total += d.windSpeed;
        roseCounts[dir].count += 1;

        const formatted = DIRECTIONS.map((dir) => ({
          direction: dir,
          avgSpeed:
            roseCounts[dir].count > 0
              ? parseFloat(
                  (roseCounts[dir].total / roseCounts[dir].count).toFixed(2)
                )
              : 0,
        }));
        setRoseData(formatted);
      }
    };

    return () => eventSource.close();
  }, []);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ background: "#1e293b", padding: 24, borderRadius: 12 }}>
        <h2 style={{ color: "#e2e8f0", marginBottom: 16 }}>
          🌬️ Atmospheric Pressure and Wind Speed (Real-Time)
        </h2>
        {timeData.length === 0 ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>
            Waiting for data...
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                interval={Math.floor(timeData.length / 8)}
              />
              <YAxis
                yAxisId="left"
                domain={["auto", "auto"]}
                tick={{ fill: "#38bdf8" }}
                label={{
                  value: "hPa",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#38bdf8",
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, "auto"]}
                tick={{ fill: "#4ade80" }}
                label={{
                  value: "m/s",
                  angle: 90,
                  position: "insideRight",
                  fill: "#4ade80",
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                }}
              />
              <Legend wrapperStyle={{ color: "#e2e8f0" }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pressure"
                stroke="#38bdf8"
                dot={false}
                name="Sea Level Pressure (hPa)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="windSpeed"
                stroke="#4ade80"
                dot={false}
                name="Wind Speed (m/s)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ background: "#1e293b", padding: 24, borderRadius: 12 }}>
        <h2 style={{ color: "#e2e8f0", marginBottom: 8 }}>
          🧭 Wind Rose - Average Speed by Direction
        </h2>
        {latest && (
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>
            Latest record:{" "}
            <strong style={{ color: "#fbbf24" }}>{latest.timestamp}</strong> |
            Direction:{" "}
            <strong style={{ color: "#f472b6" }}>
              {latest.windDirection} degrees
            </strong>{" "}
            | Speed:{" "}
            <strong style={{ color: "#4ade80" }}>{latest.windSpeed} m/s</strong>
          </p>
        )}
        {roseData.length === 0 ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>
            Waiting for data...
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={roseData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis
                dataKey="direction"
                tick={{ fill: "#cbd5e1", fontSize: 12 }}
              />
              <Radar
                name="Avg. Wind Speed (m/s)"
                dataKey="avgSpeed"
                stroke="#f472b6"
                fill="#f472b6"
                fillOpacity={0.5}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
