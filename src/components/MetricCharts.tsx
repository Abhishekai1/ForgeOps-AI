import { useState } from "react";
import { motion } from "motion/react";
import { Activity, Cpu, Database, TrendingUp } from "lucide-react";
import { MetricSnapshot } from "../types";

interface MetricChartsProps {
  history: MetricSnapshot[];
}

export default function MetricCharts({ history }: MetricChartsProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-850">
        <div className="flex flex-col items-center gap-2">
          <Activity className="h-8 w-8 animate-pulse text-emerald-500" />
          <span className="text-sm text-zinc-400">Loading incoming real-time telemetry grid...</span>
        </div>
      </div>
    );
  }

  // Draw helpers for SVG
  const width = 500;
  const height = 110;
  const padding = 10;

  const getPointsStr = (data: number[], maxVal: number = 100) => {
    if (data.length === 0) return "";
    const xStep = (width - padding * 2) / (data.length - 1 || 1);
    const points = data.map((val, index) => {
      const x = padding + index * xStep;
      // Inverse y because SVG's (0,0) is top-left
      const y = height - padding - (val / maxVal) * (height - padding * 2);
      return `${x},${y}`;
    });
    return points.join(" ");
  };

  const getPointsAreaStr = (data: number[], maxVal: number = 100) => {
    if (data.length === 0) return "";
    const xStep = (width - padding * 2) / (data.length - 1 || 1);
    const points = data.map((val, index) => {
      const x = padding + index * xStep;
      const y = height - padding - (val / maxVal) * (height - padding * 2);
      return `${x},${y}`;
    });
    
    // Append coordinates to complete area block back to baseline
    const lastX = padding + (data.length - 1) * xStep;
    const firstX = padding;
    return `${firstX},${height - padding} ${points.join(" ")} ${lastX},${height - padding}`;
  };

  const cpus = history.map(h => h.cpuUsage);
  const dbLoads = history.map(h => h.dbLoad);
  const nets = history.map(h => h.networkTraffic);
  const maxNet = Math.max(...nets, 10);

  const formatTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "--:--:--";
    }
  };

  const latest = history[history.length - 1] || {
    cpuUsage: 0,
    dbLoad: 0,
    networkTraffic: 0,
    timestamp: new Date().toISOString()
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* 1. CPU Telemetry Area */}
      <div id="card-cpu-chart" className="flex flex-col rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#00A3FF] to-[#10B981] opacity-70" />
        <div className="flex items-center justify-between pointer-events-none mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[#00A3FF]" />
            <h3 className="text-sm font-semibold tracking-wide text-[#A1A1AA] uppercase">CPU Core Array</h3>
          </div>
          <span className="text-xl font-mono font-bold tracking-tight text-[#00A3FF]">
            {latest.cpuUsage ?? 0}%
          </span>
        </div>

        <div className="relative h-[115px] w-full mt-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="cpuAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00A3FF" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#00A3FF" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Helper lines */}
            <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#27272a" strokeDasharray="3,3" />
            <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#3f3f46" strokeWidth="0.5" />

            {/* Area Path */}
            <path d={getPointsAreaStr(cpus)} fill="url(#cpuAreaGrad)" />

            {/* Line Path */}
            <motion.path
              d={getPointsStr(cpus)}
              fill="none"
              stroke="#00A3FF"
              strokeWidth="2.2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8 }}
            />

            {/* Glowing Tracker Points */}
            {cpus.map((val, idx) => {
              const xStep = (width - padding * 2) / (cpus.length - 1 || 1);
              const x = padding + idx * xStep;
              const y = height - padding - (val / 100) * (height - padding * 2);

              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r={hoveredPoint === idx ? 6 : idx === cpus.length - 1 ? 4 : 1.5}
                  cx-custom=""
                  className={`${idx === cpus.length - 1 ? 'animate-pulse' : ''} cursor-pointer opacity-90 stroke-zinc-950 stroke-2`}
                  fill={idx === cpus.length - 1 ? '#00A3FF' : '#00A3FF'}
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-[#71717A] mt-2">
          <span>{formatTime(history[0]?.timestamp)}</span>
          <span className="text-zinc-400">
            {hoveredPoint !== null ? `Point: ${cpus[hoveredPoint]}%` : "Real-time stream"}
          </span>
          <span>{formatTime(latest.timestamp)}</span>
        </div>
      </div>

      {/* 2. Database Load Area */}
      <div id="card-db-chart" className="flex flex-col rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#10B981] to-emerald-500 opacity-70" />
        <div className="flex items-center justify-between pointer-events-none mb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[#10B981]" />
            <h3 className="text-sm font-semibold tracking-wide text-[#A1A1AA] uppercase">DB Pool Load</h3>
          </div>
          <span className="text-xl font-mono font-bold tracking-tight text-[#10B981]">
            {latest.dbLoad ?? 0}%
          </span>
        </div>

        <div className="relative h-[115px] w-full mt-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="dbAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Helper lines */}
            <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#27272a" strokeDasharray="3,3" />
            <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#3f3f46" strokeWidth="0.5" />

            {/* Area Path */}
            <path d={getPointsAreaStr(dbLoads)} fill="url(#dbAreaGrad)" />

            {/* Line Path */}
            <motion.path
              d={getPointsStr(dbLoads)}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8 }}
            />

            {/* Points */}
            {dbLoads.map((val, idx) => {
              const xStep = (width - padding * 2) / (dbLoads.length - 1 || 1);
              const x = padding + idx * xStep;
              const y = height - padding - (val / 100) * (height - padding * 2);

              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r={hoveredPoint === idx ? 6 : idx === dbLoads.length - 1 ? 4 : 1.5}
                  className={`${idx === dbLoads.length - 1 ? 'animate-pulse' : ''} cursor-pointer opacity-90 stroke-zinc-950 stroke-2`}
                  fill={idx === dbLoads.length - 1 ? '#10B981' : '#10B981'}
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-[#71717A] mt-2">
          <span>{formatTime(history[0]?.timestamp)}</span>
          <span className="text-zinc-400">
            {hoveredPoint !== null ? `Point: ${dbLoads[hoveredPoint]}%` : "Real-time stream"}
          </span>
          <span>{formatTime(latest.timestamp)}</span>
        </div>
      </div>

      {/* 3. Network Traffic Rate */}
      <div id="card-network-chart" className="flex flex-col rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500 to-indigo-500 opacity-70" />
        <div className="flex items-center justify-between pointer-events-none mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-400" />
            <h3 className="text-sm font-semibold tracking-wide text-[#A1A1AA] uppercase">I/O Relay Flow</h3>
          </div>
          <span className="text-xl font-mono font-bold tracking-tight text-violet-400">
            {latest.networkTraffic ?? 0} <span className="text-xs text-[#71717A]">Gbps</span>
          </span>
        </div>

        <div className="relative h-[115px] w-full mt-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="netAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Helper lines */}
            <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#27272a" strokeDasharray="3,3" />
            <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#3f3f46" strokeWidth="0.5" />

            {/* Area Path */}
            <path d={getPointsAreaStr(nets, maxNet)} fill="url(#netAreaGrad)" />

            {/* Line Path */}
            <motion.path
              d={getPointsStr(nets, maxNet)}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8 }}
            />

            {/* Points */}
            {nets.map((val, idx) => {
              const xStep = (width - padding * 2) / (nets.length - 1 || 1);
              const x = padding + idx * xStep;
              const y = height - padding - (val / maxNet) * (height - padding * 2);

              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r={hoveredPoint === idx ? 6 : idx === nets.length - 1 ? 4 : 1.5}
                  className={`${idx === nets.length - 1 ? 'animate-pulse' : ''} cursor-pointer opacity-90 stroke-zinc-950 stroke-2`}
                  fill={idx === nets.length - 1 ? '#8b5cf6' : '#8b5cf6'}
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-[#71717A] mt-2">
          <span>{formatTime(history[0]?.timestamp)}</span>
          <span className="text-zinc-400">
            {hoveredPoint !== null ? `Point: ${nets[hoveredPoint]} Gbps` : "Real-time stream"}
          </span>
          <span>{formatTime(latest.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
