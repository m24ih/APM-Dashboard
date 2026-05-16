import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Area, ComposedChart } from 'recharts';

const UI_UPDATE_INTERVAL_MS = 1200;
const RAW_STREAM_LIMIT = 240;
const MAX_CHART_BUCKETS = 36;

const STREAM_FIELDS = [
  'meter_reading',
  'airTemperature',
  'cloudCoverage',
  'dewTemperature',
  'precipDepth1HR',
  'precipDepth6HR',
  'seaLvlPressure',
  'windDirection',
  'windSpeed',
  'carbon_emission_kg'
];

const toFiniteNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const formatMetric = (value, decimals = 2, fallback = 'Streaming...') => {
  const numericValue = toFiniteNumber(value);
  return numericValue === null ? fallback : numericValue.toFixed(decimals);
};

const formatMetricWithUnit = (value, unit, decimals = 2, fallback = 'Streaming...') => {
  const numericValue = toFiniteNumber(value);
  return numericValue === null ? fallback : `${numericValue.toFixed(decimals)} ${unit}`;
};

const parseStreamTime = (timestamp) => {
  if (!timestamp || typeof timestamp !== 'string') {
    return null;
  }

  const parsedTime = new Date(timestamp.replace(' ', 'T')).getTime();
  return Number.isFinite(parsedTime) ? parsedTime : null;
};

const chooseBucketGranularity = (records) => {
  const validTimes = records
    .map((record) => parseStreamTime(record.timestamp))
    .filter((time) => time !== null);

  if (validTimes.length < 2) {
    return 'minute';
  }

  const spanMs = Math.max(...validTimes) - Math.min(...validTimes);
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;

  if (spanMs > 3 * dayMs) {
    return 'day';
  }

  if (spanMs > 3 * hourMs) {
    return 'hour';
  }

  return 'minute';
};

const getBucketKey = (timestamp, granularity, fallbackIndex) => {
  if (!timestamp || typeof timestamp !== 'string') {
    return `sample-${fallbackIndex}`;
  }

  const [datePart, timePart = '00:00:00'] = timestamp.split(' ');
  const [hour = '00', minute = '00'] = timePart.split(':');

  if (granularity === 'day') {
    return datePart;
  }

  if (granularity === 'hour') {
    return `${datePart} ${hour}:00:00`;
  }

  return `${datePart} ${hour}:${minute}:00`;
};

const getBucketLabel = (bucketKey, granularity) => {
  if (bucketKey.startsWith('sample-')) {
    return bucketKey.replace('sample-', '#');
  }

  if (granularity === 'day') {
    return bucketKey.slice(5);
  }

  const [, timePart = bucketKey] = bucketKey.split(' ');
  const [hour = '00', minute = '00'] = timePart.split(':');
  return granularity === 'hour' ? `${hour}:00` : `${hour}:${minute}`;
};

const aggregateStreamWindow = (records) => {
  if (!records.length) {
    return [];
  }

  const visibleRecords = records.slice(-RAW_STREAM_LIMIT);
  const granularity = chooseBucketGranularity(visibleRecords);
  const buckets = new Map();

  visibleRecords.forEach((record, index) => {
    const bucketKey = getBucketKey(record.timestamp, granularity, index);

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        timestamp: bucketKey,
        timeLabel: getBucketLabel(bucketKey, granularity),
        count: 0,
        sums: {},
        counts: {}
      });
    }

    const bucket = buckets.get(bucketKey);
    bucket.count += 1;

    STREAM_FIELDS.forEach((field) => {
      const numericValue = toFiniteNumber(record[field]);
      if (numericValue === null) {
        return;
      }

      bucket.sums[field] = (bucket.sums[field] || 0) + numericValue;
      bucket.counts[field] = (bucket.counts[field] || 0) + 1;
    });
  });

  return Array.from(buckets.values())
    .map((bucket) => {
      const aggregateRecord = {
        timestamp: bucket.timestamp,
        timeLabel: bucket.timeLabel,
        count: bucket.count
      };

      STREAM_FIELDS.forEach((field) => {
        if (bucket.counts[field]) {
          aggregateRecord[field] = bucket.sums[field] / bucket.counts[field];
        }
      });

      return aggregateRecord;
    })
    .slice(-MAX_CHART_BUCKETS);
};

export default function App() {
  const [viewMode, setViewMode] = useState('Manager');
  const [buildingInfo, setBuildingInfo] = useState(null);
  const [streamData, setStreamData] = useState([]);
  const [latestMetrics, setLatestMetrics] = useState(null);
  const latestMetricsRef = useRef(null);
  const streamBufferRef = useRef([]);
  const isTechnicalView = viewMode === 'Technical';

  // 1. Fetch Static Building Information
  useEffect(() => {
    fetch('http://localhost:8000/api/static')
      .then(res => res.json())
      .then(data => setBuildingInfo(data))
      .catch(err => console.error("Error loading building static metadata:", err));
  }, []);

  // 2. Connect to Real-Time Server-Sent Events (SSE) Stream
  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8000/api/stream');
    let isActive = true;

    const flushBufferedStream = () => {
      if (!isActive || !latestMetricsRef.current) {
        return;
      }

      setLatestMetrics(latestMetricsRef.current);
      setStreamData(aggregateStreamWindow(streamBufferRef.current));
    };

    const flushTimer = window.setInterval(flushBufferedStream, UI_UPDATE_INTERVAL_MS);

    eventSource.onmessage = (event) => {
      try {
        const parsedRecord = JSON.parse(event.data);
        latestMetricsRef.current = parsedRecord;

        streamBufferRef.current.push(parsedRecord);
        if (streamBufferRef.current.length > RAW_STREAM_LIMIT) {
          streamBufferRef.current.splice(0, streamBufferRef.current.length - RAW_STREAM_LIMIT);
        }
      } catch (error) {
        console.error("Error parsing stream chunk:", error);
      }
    };

    return () => {
      isActive = false;
      window.clearInterval(flushTimer);
      eventSource.close();
      streamBufferRef.current = [];
      latestMetricsRef.current = null;
    };
  }, []);

  const metricCards = useMemo(() => {
    if (isTechnicalView) {
      return [
        {
          label: 'AIR TEMPERATURE',
          value: formatMetricWithUnit(latestMetrics?.airTemperature, '°C', 1),
          detail: `Dew point: ${formatMetricWithUnit(latestMetrics?.dewTemperature, '°C', 1, '---')}`,
          status: 'THERMAL SENSOR FEED',
          dotClass: 'bg-sky-500',
          statusClass: 'text-sky-400'
        },
        {
          label: 'SEA-LEVEL PRESSURE',
          value: formatMetricWithUnit(latestMetrics?.seaLvlPressure, 'hPa', 1),
          detail: `Cloud cover: ${formatMetric(latestMetrics?.cloudCoverage, 0, '---')}%`,
          status: 'ATMOSPHERIC DATASET',
          dotClass: 'bg-violet-500',
          statusClass: 'text-violet-400'
        },
        {
          label: 'WIND VECTOR',
          value: formatMetricWithUnit(latestMetrics?.windSpeed, 'm/s', 1),
          detail: `Direction: ${formatMetric(latestMetrics?.windDirection, 0, '---')}°`,
          status: 'VENTILATION INPUT',
          dotClass: 'bg-cyan-500',
          statusClass: 'text-cyan-400'
        },
        {
          label: 'PRECIPITATION',
          value: formatMetricWithUnit(latestMetrics?.precipDepth1HR, 'mm', 2),
          detail: `6 hr depth: ${formatMetricWithUnit(latestMetrics?.precipDepth6HR, 'mm', 2, '---')}`,
          status: 'WEATHER LOAD FACTOR',
          dotClass: 'bg-emerald-500',
          statusClass: 'text-emerald-400'
        }
      ];
    }

    return [
      {
        label: 'CARBON EMISSION (CO₂kg)',
        value: latestMetrics ? `${formatMetric(latestMetrics.carbon_emission_kg, 2)} kg` : 'Streaming...',
        detail: 'Scope 2 operational estimate',
        status: 'ISO 14064-1 COMPLIANT',
        dotClass: 'bg-emerald-500',
        statusClass: 'text-emerald-400'
      },
      {
        label: 'ENERGY CONSUMPTION (kWh)',
        value: latestMetrics ? `${formatMetric(latestMetrics.meter_reading, 2)} kWh` : 'Streaming...',
        detail: 'Live meter correlation',
        status: 'LIVE CORRELATION ACTIVE',
        dotClass: 'bg-amber-500',
        statusClass: 'text-amber-400'
      },
      {
        label: 'BUILDING METADATA',
        value: buildingInfo ? `ID: ${buildingInfo.building_id}` : 'Loading...',
        detail: buildingInfo ? `Type: ${buildingInfo.primaryspaceusage} (${buildingInfo.sqm_sqft} sqft)` : 'Loading...',
        status: buildingInfo ? `SITE ${buildingInfo.site_id}` : 'STATIC API',
        dotClass: 'bg-indigo-500',
        statusClass: 'text-indigo-400'
      }
    ];
  }, [buildingInfo, isTechnicalView, latestMetrics]);

  const radarData = latestMetrics ? [
    { subject: 'Wind Speed', A: Math.min(latestMetrics.windSpeed * 10, 100) },
    { subject: 'Cloud Coverage', A: latestMetrics.cloudCoverage || 10 },
    { subject: 'Humidity/Dew', A: Math.abs(latestMetrics.dewTemperature) * 4 },
    { subject: 'Pressure', A: (latestMetrics.seaLvlPressure - 1000) * 2 },
    { subject: 'Precipitation', A: latestMetrics.precipDepth1HR * 100 || 20 }
  ] : [
    { subject: 'Wind Speed', A: 0 }, { subject: 'Cloud Coverage', A: 0 }, { subject: 'Humidity/Dew', A: 0 }, { subject: 'Pressure', A: 0 }, { subject: 'Precipitation', A: 0 }
  ];

  return (
    <div class="min-h-screen bg-[#0f131e] p-6 text-slate-100 font-sans">
      {/* HEADER BAR */}
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 class="text-sm font-bold uppercase tracking-wider text-indigo-400">Dashboard</h1>
          <p class="text-xs text-slate-400">Real-Time Carbon Tracking Smart Building System</p>
        </div>
        
        {/* View Toggle */}
        <div class="flex items-center bg-[#161c2d] p-1.5 rounded-lg border border-slate-700 text-xs">
          <span class="mr-2 text-slate-400 pl-2">View Profile:</span>
          <button 
            onClick={() => setViewMode('Manager')}
            class={`px-3 py-1 rounded-md transition-all ${viewMode === 'Manager' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'}`}
          >
            Manager View
          </button>
          <button 
            onClick={() => setViewMode('Technical')}
            class={`px-3 py-1 rounded-md transition-all ${viewMode === 'Technical' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'}`}
          >
            Technical View
          </button>
        </div>

        {/* Profile Card */}
        <div class="flex items-center gap-3">
          <div class="text-right">
            <h3 class="text-xs font-bold">Admin</h3>
            <p class="text-[10px] text-indigo-400">System Administrator</p>
          </div>
          <div class="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500 flex items-center justify-center text-xs font-bold text-indigo-300">
            AD
          </div>
        </div>
      </div>

      {/* KPI METRICS */}
      <div class={isTechnicalView ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6' : 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'}>
        {metricCards.map((card) => (
          <div key={card.label} class="bg-[#161c2d] p-4 rounded-xl border border-slate-800">
            <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{card.label}</p>
            <p class="text-2xl font-extrabold text-white my-1 truncate">{card.value}</p>
            <p class="text-[11px] text-slate-400 truncate">{card.detail}</p>
            <div class="flex items-center gap-1.5 mt-2">
              <span class={`w-2 h-2 rounded-full ${card.dotClass} animate-pulse`}></span>
              <span class={`text-[10px] font-bold ${card.statusClass}`}>{card.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* GRAPH SECTIONS */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div class="bg-[#161c2d] p-4 rounded-xl border border-slate-800 lg:col-span-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            {isTechnicalView ? 'Environmental Breakdown Mode' : 'Executive Correlation Mode'}
          </h3>
          <p class="text-sm font-semibold text-white mb-4">
            {isTechnicalView ? 'Cloud Coverage vs Air and Dew Temperature' : 'Energy Consumption vs Carbon Emissions'}
          </p>
          <div class="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={streamData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242f47" />
                <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={9} />
                <YAxis yAxisId="left" stroke={isTechnicalView ? '#38bdf8' : '#a3e635'} fontSize={10} />
                <YAxis yAxisId="right" orientation="right" stroke={isTechnicalView ? '#fbbf24' : '#818cf8'} fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                {isTechnicalView ? (
                  <>
                    <Bar yAxisId="left" dataKey="cloudCoverage" fill="#38bdf8" name="Cloud Coverage (%)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="airTemperature" stroke="#fbbf24" name="Air Temp (°C)" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="dewTemperature" stroke="#22d3ee" name="Dew Temp (°C)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </>
                ) : (
                  <>
                    <Bar yAxisId="left" dataKey="meter_reading" fill="#a3e635" name="Energy (kWh)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="carbon_emission_kg" stroke="#818cf8" name="CO₂ (kg)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div class="bg-[#161c2d] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              {isTechnicalView ? 'Wind & Climate Analysis' : 'Executive Snapshot'}
            </h3>
            <p class="text-xs text-slate-400 mb-4">
              {isTechnicalView ? 'HVAC Automated Sub-System' : 'Operational performance overview'}
            </p>
          </div>
          {isTechnicalView ? (
            <>
              <div class="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#242f47" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={9} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#242f47" tick={false} />
                    <Radar name="Climate Factors" dataKey="A" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.25} isAnimationActive={false} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div class="text-[10px] text-slate-400 border-t border-slate-800 pt-2 mt-2 flex justify-between">
                <span>Pressure: <strong class="text-white">{latestMetrics ? formatMetric(latestMetrics.seaLvlPressure, 1, '---') : '---'} hPa</strong></span>
                <span>Wind Speed: <strong class="text-white">{latestMetrics ? formatMetric(latestMetrics.windSpeed, 1, '---') : '---'} m/s</strong></span>
              </div>
            </>
          ) : (
            <>
              <div class="space-y-4 py-3">
                <div>
                  <div class="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
                    <span>Emissions</span>
                    <span>{latestMetrics ? `${formatMetric(latestMetrics.carbon_emission_kg, 2)} kg` : '---'}</span>
                  </div>
                  <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div class="h-full bg-emerald-500" style={{ width: `${Math.min(Number(latestMetrics?.carbon_emission_kg || 0) * 12, 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div class="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
                    <span>Energy Demand</span>
                    <span>{latestMetrics ? `${formatMetric(latestMetrics.meter_reading, 2)} kWh` : '---'}</span>
                  </div>
                  <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div class="h-full bg-amber-500" style={{ width: `${Math.min(Number(latestMetrics?.meter_reading || 0) * 6, 100)}%` }}></div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-3 pt-2">
                  <div class="border border-slate-800 rounded-lg p-3">
                    <p class="text-[10px] uppercase font-bold text-slate-400">Building</p>
                    <p class="text-sm font-bold text-white truncate">{buildingInfo ? buildingInfo.building_id : 'Loading...'}</p>
                  </div>
                  <div class="border border-slate-800 rounded-lg p-3">
                    <p class="text-[10px] uppercase font-bold text-slate-400">Samples</p>
                    <p class="text-sm font-bold text-white">{streamData.length} buckets</p>
                  </div>
                </div>
              </div>
              <div class="text-[10px] text-slate-400 border-t border-slate-800 pt-2 mt-2 flex justify-between">
                <span>Latest: <strong class="text-white">{latestMetrics ? latestMetrics.timestamp : '---'}</strong></span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* FULL-WIDTH TIME SERIES GRAPH */}
      <div class="w-full bg-[#161c2d] p-4 rounded-xl border border-slate-800">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              {isTechnicalView ? 'Environmental Time-Series Analysis' : 'Time-Series Stream Analysis'}
            </h3>
            <p class="text-sm font-semibold text-white">
              {isTechnicalView ? 'Pressure, Wind and Cloud Coverage Trend' : 'Carbon Emissions Historical Trend'}
            </p>
          </div>
          <div class="flex gap-1 bg-[#0f131e] p-1 rounded-md text-[9px] font-bold border border-slate-800">
            <span class="px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded border border-indigo-500/30 animate-pulse">Live Streaming Active</span>
          </div>
        </div>
        <div class="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={streamData}>
              <defs>
                <linearGradient id="colorEmission" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCloud" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#242f47" />
              <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={9} />
              <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} />
              <YAxis yAxisId="right" orientation="right" stroke={isTechnicalView ? '#c4b5fd' : '#a3e635'} fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
              {isTechnicalView ? (
                <>
                  <Area yAxisId="left" type="monotone" dataKey="cloudCoverage" stroke="#38bdf8" fillOpacity={1} fill="url(#colorCloud)" name="Cloud Coverage (%)" isAnimationActive={false} />
                  <Line yAxisId="left" type="monotone" dataKey="windSpeed" stroke="#22c55e" name="Wind Speed (m/s)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" dataKey="seaLvlPressure" stroke="#c4b5fd" name="Pressure (hPa)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </>
              ) : (
                <>
                  <Area yAxisId="left" type="monotone" dataKey="carbon_emission_kg" stroke="#818cf8" fillOpacity={1} fill="url(#colorEmission)" name="CO₂ (kg)" isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" dataKey="meter_reading" stroke="#a3e635" name="Energy (kWh)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
