import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, ShieldAlert, Cpu, Terminal, Sparkles, Sliders, RefreshCw,
  Plus, AlertTriangle, CheckCircle, Clock, User, TrendingUp, Layers,
  Globe, Layout, ChevronRight, FileSpreadsheet, BookOpen, TerminalSquare,
  FileText, ExternalLink, ShieldCheck, Database, AppWindow, Building, AlertCircle
} from "lucide-react";

import { Tenant, Incident, MetricSnapshot, OperationalReport, SeverityType } from "./types";
import MetricCharts from "./components/MetricCharts";
import IncidentSreRunbook from "./components/IncidentSreRunbook";
import RagManager from "./components/RagManager";
import CopilotChat from "./components/CopilotChat";

export default function App() {
  // Gate landing state
  const [hasEnteredPlatform, setHasEnteredPlatform] = useState(false);

  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeOrgId, setActiveOrgId] = useState("org-aether");
  const [userRole, setUserRole] = useState("Senior Site Reliability Engineer");

  // Dashboard View State
  const [activeTab, setActiveTab] = useState<"monitoring" | "incidents" | "knowledge" | "reports">("monitoring");

  // Dynamic Telemetry States
  const [metricsHistory, setMetricsHistory] = useState<MetricSnapshot[]>([]);
  const [incidentsList, setIncidentsList] = useState<Incident[]>([]);
  const [simulationFeed, setSimulationFeed] = useState<any[]>([]);

  
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const selectedIncidentIdRef = useRef<string | null>(null);

 
  useEffect(() => {
    selectedIncidentIdRef.current = selectedIncident ? selectedIncident.id : null;
  }, [selectedIncident]);

  const [isNewIncidentOpen, setIsNewIncidentOpen] = useState(false);
  const [isCopilotCollapsibleOpen, setIsCopilotCollapsibleOpen] = useState(true);


  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSev, setNewSev] = useState<SeverityType>("MEDIUM");
  const [newCat, setNewCat] = useState("Logistical Networks");

  const [compiledReport, setCompiledReport] = useState<OperationalReport | null>(null);
  const [isCompilingReport, setIsCompilingReport] = useState(false);

  // Floating notifications banner
  const [notifyBanner, setNotifyBanner] = useState<{
    msg: string;
    status: "success" | "error" | "warning";
  } | null>(null);

  // Notification helper
  const triggerNotification = (msg: string, status: "success" | "error" | "warning") => {
    setNotifyBanner({ msg, status });
    setTimeout(() => {
      setNotifyBanner(null);
    }, 4500);
  };

  // Initialize and Fetch Core Metadata
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await fetch("/api/tenants");
        if (res.ok) {
          const data = await res.json();
          setTenants(data);
        }
      } catch (err) {
        console.error("Failed to parse Tenants payload:", err);
      }
    };
    fetchTenants();
  }, []);

  // Sync state loops according to active Organization ID
  const syncServerData = async () => {
    try {
      // 1. Metrics History
      const metricsRes = await fetch(`/api/metrics?orgId=${activeOrgId}`);
      if (metricsRes.ok) {
        const metData = await metricsRes.json();
        setMetricsHistory(metData);
      }

      // 2. Incident List
      const incRes = await fetch(`/api/incidents?orgId=${activeOrgId}`);
      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidentsList(incData);
        
        // If an incident was selected, hot-reload its metrics inside the opened drawer
        // Use the mutable ref value to ensure we do not resurrect a closed drawer during delayed fetches
        const currentSelectedId = selectedIncidentIdRef.current;
        if (currentSelectedId) {
          const fresh = incData.find((i: Incident) => i.id === currentSelectedId);
          if (fresh) setSelectedIncident(fresh);
        }
      }

      // 3. Simulation Log Ticker
      const simRes = await fetch(`/api/simulation/timeline?orgId=${activeOrgId}`);
      if (simRes.ok) {
        const simData = await simRes.json();
        setSimulationFeed(simData);
      }
    } catch (err) {
      console.error("Telemetry sync failure:", err);
    }
  };

  // Run initial fetch on organization switch
  useEffect(() => {
    syncServerData();
  }, [activeOrgId]);

  
  useEffect(() => {
    const tick = setInterval(() => {
      if (hasEnteredPlatform) {
        syncServerData();
      }
    }, 5000);
    return () => clearInterval(tick);
  }, [activeOrgId, hasEnteredPlatform, selectedIncident]);

  // Form submit: Create new incident (calls Gemini AI under the hood)
  const submitIncidentHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      triggerNotification("Ticket Fields are strictly required.", "warning");
      return;
    }

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          severity: newSev,
          category: newCat,
          organizationId: activeOrgId,
          assignee: userRole
        })
      });

      if (res.ok) {
        const freshInc = await res.json();
        setIncidentsList(prev => [freshInc, ...prev]);
        setNewTitle("");
        setNewDesc("");
        setIsNewIncidentOpen(false);
        triggerNotification(`Incident [${freshInc.id}] successfully logged. SRE Autopilot engaged.`, "success");
        syncServerData();
      } else {
        triggerNotification("Failed to dispatch incident report.", "error");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("Server synchronization error during triage process.", "error");
    }
  };

  // Inject a manual simulation warning directly onto the metrics
  const triggerSimulationSurge = async (scenario: string) => {
    const configs: Record<string, any> = {
      thermal: { system: "Thermal Core Sensor", severity: "CRITICAL", message: "CRITICAL WARNING: Manual containment coolant override induced pressure spike." },
      slip: { system: "Auxiliary Transmission System", severity: "HIGH", message: "WARNING: Rotation synchronization slip flagged on torque conduits." },
      leak: { system: "Primary Valve Gate", severity: "MEDIUM", message: "NOTICE: Simulated sensor signal drift logged on backup ports." }
    };

    const target = configs[scenario];
    try {
      const res = await fetch("/api/simulation/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...target,
          organizationId: activeOrgId
        })
      });

      if (res.ok) {
        triggerNotification(`Simulation event [${target.system}] injected successfully.`, "warning");
        syncServerData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Request executive analysis summary compile (calls Gemini report proxy)
  const compileReportHandler = async () => {
    setIsCompilingReport(true);
    setCompiledReport(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrgId,
          timeframe: "Past 24 Hours"
        })
      });

      if (res.ok) {
        const report = await res.json();
        setCompiledReport(report);
        triggerNotification(`Executive Intelligence Brief compiled. Integrity Verified.`, "success");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("Synthesis pipeline failed to compile audit records.", "error");
    } finally {
      setIsCompilingReport(false);
    }
  };

  const activeTenant = tenants.find(t => t.id === activeOrgId) || tenants[0];
  const lastMetricSnapshot = metricsHistory[metricsHistory.length - 1] || {};

  return (
    <div className="min-h-screen bg-[#09090B] text-[#E4E4E7] font-sans selection:bg-zinc-800 selection:text-white overflow-x-hidden flex flex-col relative">

      {/* Floating Notifications UI */}
      <AnimatePresence>
        {notifyBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 py-3 px-5 rounded-xl border border-[#27272A] shadow-2xl bg-[#18181B]/95 backdrop-blur font-mono text-xs max-w-md"
            style={{
              borderColor: notifyBanner.status === "success" ? "#10B981" : notifyBanner.status === "error" ? "#EF4444" : "#F59E0B"
            }}
          >
            {notifyBanner.status === "success" && <CheckCircle className="h-4 w-4 text-[#10B981] shrink-0" />}
            {notifyBanner.status === "error" && <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />}
            {notifyBanner.status === "warning" && <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />}
            <span className="text-[#E4E4E7] font-medium select-none">{notifyBanner.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!hasEnteredPlatform ? (
          
          /* -------------------------------------------------------------
           * LANDING GATEWAY / ENTRANCE CARD (SLIK DESIGNED)
           * ------------------------------------------------------------- */
          <motion.div 
            id="landing-portal-gate"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#09090B] z-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#18181B] via-[#09090B] to-[#09090B]"
          >
            <motion.div 
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="max-w-xl w-full rounded-2xl border border-[#27272A] bg-[#18181B] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#00A3FF] via-[#10B981] to-violet-500 opacity-90" />
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                
                {/* Visual Identity Logo */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#27272A] bg-[#09090B] text-[#00A3FF]">
                  <Activity className="h-4 w-4 animate-pulse text-[#00A3FF]" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em]">FORGE_OPS SYSTEMS INTEGRITY</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans sm:text-4xl">
                    FORGE<span className="text-[#00A3FF]">OPS</span> AI
                  </h1>
                  <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto leading-relaxed font-sans">
                    Mission-critical enterprise SRE platform for incident automation, vector SOP retrieval, and telemetry intelligence.
                  </p>
                </div>

                {/* Tenant sector selector */}
                <div className="w-full text-left bg-[#09090B] rounded-xl border border-[#27272A] p-4 space-y-3">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#71717A] block select-none">Global Production Clusters</span>
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={() => { setActiveOrgId("org-aether"); triggerNotification("Organization switched to Aether Networks", "success"); }}
                      className={`flex items-center justify-between p-3 rounded-lg border text-xs font-semibold tracking-wide transition-all ${activeOrgId === "org-aether" ? 'bg-[#18181B] text-[#00A3FF] border-[#27272A]' : 'bg-transparent text-[#71717A] border-[#27272A]/45 hover:border-[#27272A] hover:text-[#A1A1AA]'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Aether Production Networks
                      </span>
                      <span className="text-[9px] font-mono opacity-80">SLA: 99.95%</span>
                    </button>

                    <button 
                      onClick={() => { setActiveOrgId("org-chronos"); triggerNotification("Organization switched to Chronos Logistics", "success"); }}
                      className={`flex items-center justify-between p-3 rounded-lg border text-xs font-semibold tracking-wide transition-all ${activeOrgId === "org-chronos" ? 'bg-[#18181B] text-[#00A3FF] border-[#27272A]' : 'bg-transparent text-[#71717A] border-[#27272A]/45 hover:border-[#27272A] hover:text-[#A1A1AA]'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Chronos Fleet Logistics
                      </span>
                      <span className="text-[9px] font-mono opacity-80">SLA: 99.9%</span>
                    </button>

                    <button 
                      onClick={() => { setActiveOrgId("org-hyperion"); triggerNotification("Organization switched to Hyperion Infrastructure", "success"); }}
                      className={`flex items-center justify-between p-3 rounded-lg border text-xs font-semibold tracking-wide transition-all ${activeOrgId === "org-hyperion" ? 'bg-[#18181B] text-[#00A3FF] border-[#27272A]' : 'bg-transparent text-[#71717A] border-[#27272A]/45 hover:border-[#27272A] hover:text-[#A1A1AA]'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Cpu className="h-4 w-4" />
                        Hyperion Infrastructure Services
                      </span>
                      <span className="text-[9px] font-mono opacity-80">SLA: 99.99%</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setHasEnteredPlatform(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-lg border border-[#00A3FF]/40 bg-[#00A3FF]/15 hover:bg-[#00A3FF]/25 font-bold text-xs tracking-widest uppercase text-white transition-all cursor-pointer shadow-lg"
                >
                  <Terminal className="h-4 w-4 text-[#00A3FF]" />
                  Establish Secure Session
                </button>

                <span className="text-[9px] font-mono text-zinc-600 select-none">
                  SECURE PROTOCOLS VERIFIED — STANDALONE INTERFACE PORT 3000
                </span>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          
          /* -------------------------------------------------------------
           * MASTER COMMAND CENTER DASHBOARD (LANDING AFTER Handshake)
           * ------------------------------------------------------------- */
          <div className="flex-1 flex flex-col container mx-auto px-4 py-6 md:py-8 space-y-6">
            
            {/* 1. Header Grid Navigation Bar */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#27272A] pb-5 bg-[#09090B]">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-4 select-none">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#00A3FF] rounded-sm flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white uppercase font-sans">F</span>
                    </div>
                    <span className="font-bold tracking-tight text-lg text-white">FORGE<span className="text-[#00A3FF]">OPS</span></span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-[#18181B] border border-[#27272A] rounded-md">
                    <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
                    <span className="text-[11px] font-mono text-[#A1A1AA]">SYSTEM READY // US-EAST-1</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 pointer-events-auto">
                  <Building className="h-3.5 w-3.5 text-[#71717A]" />
                  <span className="text-xs text-[#71717A] font-medium">Domain Directory:</span>
                  <select 
                    value={activeOrgId}
                    onChange={(e) => {
                      setActiveOrgId(e.target.value);
                      triggerNotification(`Active partition adjusted to ${tenants.find(t=>t.id===e.target.value)?.name}`, "success");
                    }}
                    className="bg-transparent border-none text-xs font-bold text-[#E4E4E7] hover:text-[#00A3FF] focus:outline-none cursor-pointer p-0 font-sans"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id} className="bg-[#18181B] text-zinc-100">{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Central Navigation Tabs Controllers */}
              <div className="flex flex-wrap items-center gap-2 select-none self-start sm:self-center font-sans">
                <button
                  onClick={() => { setActiveTab("monitoring"); setSelectedIncident(null); }}
                  className={`px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer border-b-2 ${activeTab === "monitoring" ? 'text-white border-[#00A3FF]' : 'text-[#A1A1AA] border-transparent hover:text-white'}`}
                >
                  Dashboard
                </button>

                <button
                  onClick={() => { setActiveTab("incidents"); setSelectedIncident(null); }}
                  className={`px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer border-b-2 ${activeTab === "incidents" ? 'text-white border-[#00A3FF]' : 'text-[#A1A1AA] border-transparent hover:text-white'}`}
                >
                  Incidents ({incidentsList.filter(i=>i.status !== "CLOSED").length})
                </button>

                <button
                  onClick={() => { setActiveTab("knowledge"); setSelectedIncident(null); }}
                  className={`px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer border-b-2 ${activeTab === "knowledge" ? 'text-white border-[#00A3FF]' : 'text-[#A1A1AA] border-transparent hover:text-white'}`}
                >
                  Knowledge
                </button>

                <button
                  onClick={() => { setActiveTab("reports"); setSelectedIncident(null); }}
                  className={`px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer border-b-2 ${activeTab === "reports" ? 'text-white border-[#00A3FF]' : 'text-[#A1A1AA] border-transparent hover:text-white'}`}
                >
                  Intelligence Code
                </button>
              </div>

              {/* Role chooser */}
              <div className="flex items-center gap-2 select-none bg-[#18181B] border border-[#27272A] px-3 py-1.5 rounded-lg font-mono text-[10px] text-[#A1A1AA]">
                <User className="h-3.5 w-3.5 text-[#71717A]" />
                <span className="uppercase tracking-wider">Access Clearance:</span>
                <select
                  value={userRole}
                  onChange={(e) => {
                    setUserRole(e.target.value);
                    triggerNotification(`Security profile active: ${e.target.value}`, "warning");
                  }}
                  className="bg-transparent border-none focus:outline-none text-[#E4E4E7] hover:text-[#00A3FF] cursor-pointer text-[10px] font-bold uppercase p-0"
                >
                  <option value="Senior Site Reliability Engineer" className="bg-[#18181B] text-zinc-300">Senior SRE</option>
                  <option value="Principal Forward Deployed Architect" className="bg-[#18181B] text-zinc-300">Principal FDE</option>
                  <option value="Incident Commander" className="bg-[#18181B] text-zinc-300">Incident Cmdr</option>
                </select>
              </div>
            </header>

            {/* 2. Primary KPI Telemetry Ribbon */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
              
              <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl shadow-xl flex items-center justify-between relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#00A3FF]" />
                <div className="space-y-1 pl-1">
                  <span className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider block">Operational Target sector</span>
                  <span className="text-sm font-bold tracking-wide text-[#E4E4E7] truncate block max-w-[150px]">{activeTenant?.sector}</span>
                </div>
                <Globe className="h-4.5 w-4.5 text-[#52525B] shrink-0 ml-2" />
              </div>

              <div id="kpi-sla" className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl shadow-xl flex items-center justify-between relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#00A3FF]" />
                <div className="space-y-1 pl-1">
                  <span className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider block">AI SIGNAL CONFIDENCE</span>
                  <span className="text-sm font-mono font-bold tracking-tight text-[#00A3FF]">
                    {lastMetricSnapshot.slaPercentage ?? activeTenant?.slaTarget ?? "98.4"}%
                  </span>
                </div>
                <TrendingUp className="h-4.5 w-4.5 text-[#00A3FF] shrink-0 ml-2" />
              </div>

              <div id="kpi-incidents" className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl shadow-xl flex items-center justify-between relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#EF4444]" />
                <div className="space-y-1 pl-1">
                  <span className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider block">Active Failure Queue</span>
                  <span className="text-sm font-mono font-bold tracking-tight text-[#EF4444]">
                    {incidentsList.filter(i=>i.status !== "CLOSED").length} <span className="text-[10px] text-[#A1A1AA]">INCIDENTS</span>
                  </span>
                </div>
                <ShieldAlert className="h-4.5 w-4.5 text-[#EF4444] shrink-0 ml-2" />
              </div>

              <div id="kpi-anomaly" className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl shadow-xl flex items-center justify-between relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-violet-500" />
                <div className="space-y-1 pl-1">
                  <span className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider block">RAG Deep Pipeline depth</span>
                  <span className="text-sm font-mono font-bold tracking-tight text-violet-400">
                    {(lastMetricSnapshot.anomalyScore ?? 1.2) * 100}k <span className="text-[10px] text-[#A1A1AA]">CHUNKS</span>
                  </span>
                </div>
                <Sparkles className="h-4.5 w-4.5 text-violet-400 shrink-0 ml-2" />
              </div>

            </section>

            {/* 3. Main Body Structure (Grid Splits 12 Cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
              
              {/* Core Content Area (8 Cols or 12 Cols depending on Copilot sidebar state) */}
              <div className={`${isCopilotCollapsibleOpen ? "lg:col-span-8" : "lg:col-span-12"} space-y-6 transition-all duration-300`}>
                
                {/* -------------------------------------------------------------
                 * TAB A: ACTIVE PLATFORM MONITORING PANEL
                 * ------------------------------------------------------------- */}
                {activeTab === "monitoring" && (
                  <div className="space-y-6">
                    {/* SVG Telemetry Charts */}
                    <MetricCharts history={metricsHistory} />

                    {/* Simulation logs & controls split */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      
                      {/* Left: Alerts log feed (7 columns) */}
                      <div className="md:col-span-7 rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                          <div className="flex items-center gap-1.5 select-none">
                            <Sliders className="h-4 w-4 text-[#00A3FF]" />
                            <h3 className="text-xs font-semibold tracking-wide text-white uppercase">Operational Activity Streams</h3>
                          </div>
                          <span className="text-[9px] font-mono bg-[#09090B] text-[#A1A1AA] px-2 py-0.5 rounded border border-[#27272A]">
                            Telemetry Auto-Tick Active
                          </span>
                        </div>

                        <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                          {simulationFeed.length === 0 ? (
                            <div className="text-center text-[#71717A] py-12 text-xs animate-pulse">Establishing sensory grid bridges...</div>
                          ) : (
                            simulationFeed.map((feed) => (
                              <div 
                                key={feed.id}
                                className="rounded-lg bg-[#09090B] border border-[#27272A] p-3 flex items-start gap-3 hover:bg-[#27272A]/20 transition shadow-sm font-sans"
                              >
                                <div className="mt-1 flex-shrink-0">
                                  {feed.severity === "CRITICAL" ? (
                                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                  ) : feed.severity === "HIGH" ? (
                                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                                  ) : (
                                    <div className="h-2 w-2 rounded-full bg-zinc-500" />
                                  )}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between font-mono text-[9px] text-[#71717A]">
                                    <span className="font-bold text-[#A1A1AA] uppercase tracking-widest">{feed.source}</span>
                                    <span>{new Date(feed.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed font-sans">{feed.message}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Right: Manual Simulation controls (5 columns) */}
                      <div className="md:col-span-5 rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-2xl flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 border-b border-[#27272A] pb-3 mb-4 select-none">
                            <TerminalSquare className="h-4.5 w-4.5 text-[#00A3FF] animate-pulse" />
                            <h3 className="text-xs font-semibold tracking-wide text-white uppercase">Scenario Control Rig</h3>
                          </div>
                          <p className="text-xs text-[#A1A1AA] font-sans leading-relaxed mb-4">
                            Inject manual sensor failures or anomalies directly onto telemetry nodes to evaluate system SLA recovery metrics and real-time AI reactions.
                          </p>
                        </div>

                        <div className="space-y-2.5 font-sans">
                          <button
                            onClick={() => triggerSimulationSurge("thermal")}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-red-900/40 bg-red-950/15 hover:bg-red-950/25 transition text-left cursor-pointer group"
                          >
                            <span className="text-xs font-medium text-red-300">Trigger Coolant Overpressure Surge</span>
                            <ChevronRight className="h-4 w-4 text-red-450 group-hover:translate-x-1 transition" />
                          </button>

                          <button
                            onClick={() => triggerSimulationSurge("slip")}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-amber-900/40 bg-amber-950/15 hover:bg-amber-950/25 transition text-left cursor-pointer group"
                          >
                            <span className="text-xs font-medium text-amber-300">Inject CNC Mechanical Drive Slip</span>
                            <ChevronRight className="h-4 w-4 text-amber-450 group-hover:translate-x-1 transition" />
                          </button>

                          <button
                            onClick={() => triggerSimulationSurge("leak")}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-[#27272A] bg-[#09090B] hover:bg-[#27272A]/30 transition text-left cursor-pointer group"
                          >
                            <span className="text-xs font-medium text-[#A1A1AA] font-sans">Simulate Sensor Signal Drift Loop</span>
                            <ChevronRight className="h-4 w-4 text-[#71717A] group-hover:translate-x-1 transition" />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}


                {/* -------------------------------------------------------------
                 * TAB B: RESOLUTION CONTROL GRID
                 * ------------------------------------------------------------- */}
                 {activeTab === "incidents" && (
                  <div className="space-y-6">
                    
                    {/* Header bar and Trigger Modalers */}
                    <div className="flex items-center justify-between select-none">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">Incident Resolution Ledger</h3>
                      
                      <button
                        onClick={() => setIsNewIncidentOpen(!isNewIncidentOpen)}
                        className="flex items-center gap-2 py-2 px-4 rounded-lg bg-[#00A3FF]/15 border border-[#00A3FF]/40 hover:bg-[#00A3FF]/25 text-xs font-bold uppercase tracking-wider text-white cursor-pointer shadow-md transition"
                      >
                        <Plus className="h-4 w-4 text-[#00A3FF]" />
                        Log Manual Incident Event
                      </button>
                    </div>

                    {/* Expandable creation drawer */}
                    <AnimatePresence>
                      {isNewIncidentOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-2xl overflow-hidden mb-6"
                        >
                          <form onSubmit={submitIncidentHandler} className="space-y-4">
                            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#A1A1AA] border-b border-[#27272A] pb-2">File New Operational Failure Incident</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono tracking-wider font-bold text-[#71717A] uppercase">Incident Title</label>
                                <input
                                  type="text"
                                  value={newTitle}
                                  onChange={(e) => setNewTitle(e.target.value)}
                                  placeholder="E.g., CNC Milling Spindle Synchronization fault"
                                  className="w-full rounded-lg text-xs font-sans py-2.5 px-3 bg-[#09090B] border border-[#27272A] focus:outline-none focus:border-[#00A3FF] text-[#E4E4E7]"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-mono tracking-wider font-bold text-[#71717A] uppercase">Severity Priority</label>
                                  <select
                                    value={newSev}
                                    onChange={(e) => setNewSev(e.target.value as SeverityType)}
                                    className="w-full rounded-lg text-xs font-sans py-2.5 px-3 bg-[#09090B] border border-[#27272A] focus:outline-none focus:border-[#00A3FF] text-[#E4E4E7] cursor-pointer"
                                  >
                                    <option value="LOW" className="bg-[#18181B]">🔵 LOW</option>
                                    <option value="MEDIUM" className="bg-[#18181B]">🟢 MEDIUM</option>
                                    <option value="HIGH" className="bg-[#18181B]">🟡 HIGH</option>
                                    <option value="CRITICAL" className="bg-[#18181B]">🔴 CRITICAL</option>
                                  </select>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-mono tracking-wider font-bold text-[#71717A] uppercase">Category Domain</label>
                                  <input
                                    type="text"
                                    value={newCat}
                                    onChange={(e) => setNewCat(e.target.value)}
                                    className="w-full rounded-lg text-xs font-sans py-2.5 px-3 bg-[#09090B] border border-[#27272A] focus:outline-none focus:border-[#00A3FF] text-[#E4E4E7]"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono tracking-wider font-bold text-[#71717A] uppercase">System Diagnostics / Description Output</label>
                              <textarea
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                placeholder="Details logs and metrics to feed standard diagnostic SOP engines..."
                                rows={3}
                                className="w-full rounded-lg text-xs font-mono py-2 px-3 bg-[#09090B] border border-[#27272A] focus:outline-none focus:border-[#00A3FF] text-[#E4E4E7] placeholder-[#71717A] font-sans"
                              />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setIsNewIncidentOpen(false)}
                                className="py-2 px-4 rounded-lg text-xs font-semibold border border-[#27272A] text-[#71717A] hover:text-[#E4E4E7] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="py-2 px-5 rounded-lg bg-[#00A3FF]/15 border border-[#00A3FF]/45 text-white font-bold hover:bg-[#00A3FF]/25 text-xs tracking-wider uppercase cursor-pointer transition"
                              >
                                Dispatch and Analyze via AI
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Active Incident List Ledger Grid */}
                    <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-2xl">
                      <div className="overflow-x-auto">
                        <table className="w-full select-none text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#27272A] font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                              <th className="pb-3 pt-1">Severity</th>
                              <th className="pb-3 pt-1">Incident Details</th>
                              <th className="pb-3 pt-1">Category Domain</th>
                              <th className="pb-3 pt-1">Lifecycle Status</th>
                              <th className="pb-3 pt-1">SRE Lead</th>
                              <th className="pb-3 pt-1">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {incidentsList.length === 0 ? (
                               <tr>
                                 <td colSpan={6} className="text-center py-10 text-[#71717A] text-xs">No active incidents found matching filter arrays.</td>
                               </tr>
                            ) : (
                              incidentsList.map((inc) => (
                                <tr 
                                  key={inc.id}
                                  className="border-b border-[#27272A]/30 hover:bg-[#27272A]/20 transition-all text-xs"
                                >
                                  <td className="py-4 font-mono font-bold">
                                    <span className={`px-2 py-0.5 rounded border text-[9px] ${
                                      inc.severity === "CRITICAL" ? "text-red-400 bg-red-950/25 border-red-900" :
                                      inc.severity === "HIGH" ? "text-amber-400 bg-amber-950/25 border-amber-900" :
                                      inc.severity === "MEDIUM" ? "text-[#00A3FF] bg-[#00A3FF]/10 border-[#00A3FF]/40" :
                                      "text-[#71717A] bg-[#09090B] border-[#27272A]"
                                    }`}>
                                      {inc.severity}
                                    </span>
                                  </td>
                                  <td className="py-4 pr-3">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-white tracking-wide">{inc.title}</span>
                                      <span className="text-[10px] text-[#A1A1AA] mt-1 truncate max-w-[280px] font-sans">{inc.description}</span>
                                    </div>
                                  </td>
                                  <td className="py-4 text-[#A1A1AA] font-medium font-mono text-[11px]">{inc.category}</td>
                                  <td className="py-4 text-[#A1A1AA] font-medium">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono font-semibold ${
                                      inc.status === "CLOSED" ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/40" :
                                      inc.status === "INVESTIGATING" ? "bg-violet-950/40 text-violet-400 border border-violet-900/40" :
                                      "bg-zinc-900 text-zinc-400 border border-zinc-800"
                                    }`}>
                                      {inc.status}
                                    </span>
                                  </td>
                                  <td className="py-4 text-[#A1A1AA] font-mono text-[10px]">{inc.assignee}</td>
                                  <td className="py-4">
                                    <button
                                      onClick={() => setSelectedIncident(inc)}
                                      className="py-1 px-3 rounded bg-[#09090B] border border-[#27272A] hover:border-[#00A3FF] hover:bg-[#18181B] text-zinc-300 font-semibold cursor-pointer transition text-xs"
                                    >
                                      SRE Triage Playbook
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}


                {/* -------------------------------------------------------------
                 * TAB C: RAG KNOWLEDGE BASE MANAGERS INDEX
                 * ------------------------------------------------------------- */}
                {activeTab === "knowledge" && (
                  <RagManager onNotify={triggerNotification} />
                )}


                {/* -------------------------------------------------------------
                 * TAB D: AUTOMATED EXECUTIVE REPORT COMPILERS
                 * ------------------------------------------------------------- */}
                 {activeTab === "reports" && (
                   <div className="space-y-6">
                     
                     {/* Header generator button area */}
                     <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-6 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 select-none">
                       <div className="space-y-1.5 flex-1 max-w-xl">
                         <h3 className="text-sm font-semibold tracking-wide text-white uppercase flex items-center gap-2">
                           <FileText className="h-5 w-5 text-[#00A3FF]" />
                           Generative Executive Operational Report Compilation core
                         </h3>
                         <p className="text-xs text-[#A1A1AA] leading-relaxed font-sans">
                           Trigger standard compliance reporting audits on the active corporate directory. We compile historic telemetry stats, live incident resolution timelines, and run security compliance analysis via Gemini.
                         </p>
                       </div>

                       <button
                         onClick={compileReportHandler}
                         disabled={isCompilingReport}
                         className="py-3 px-6 rounded-lg border border-[#00A3FF]/40 bg-[#00A3FF]/15 hover:bg-[#00A3FF]/25 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40 transition cursor-pointer self-start md:self-center shrink-0"
                       >
                         {isCompilingReport ? (
                           <span className="flex items-center gap-2">
                             <RefreshCw className="h-4 w-4 animate-spin text-[#00A3FF]" />
                             Synthesizing Operational Data...
                           </span>
                         ) : (
                           "Compile Board-Ready Intelligence Brief"
                         )}
                       </button>
                     </div>

                     {/* Compiled Report Renderer board */}
                     {compiledReport && (
                       <motion.div
                         initial={{ opacity: 0, scale: 0.98 }}
                         animate={{ opacity: 1, scale: 1 }}
                         className="rounded-xl border border-[#27272A] bg-[#18181B] p-6 shadow-2xl space-y-6 select-text"
                       >
                         {/* Report Header specifications */}
                         <div className="flex items-center justify-between border-b border-[#27272A] pb-4 select-none">
                           <div className="space-y-1">
                             <span className="text-[9px] font-mono uppercase tracking-widest text-[#00A3FF] block font-bold font-sans">ForgeOps AI Compliance Synthesis Report</span>
                             <h2 className="text-lg font-bold text-white tracking-wide">{compiledReport.title}</h2>
                           </div>
                           <div className="flex items-center gap-3">
                             <span className="text-[10px] font-mono text-[#71717A]">COMPILED: {new Date(compiledReport.generatedAt).toLocaleDateString()}</span>
                             <button
                               type="button"
                               onClick={() => setCompiledReport(null)}
                               className="py-1 px-2 border border-[#27272A] hover:border-red-900 bg-[#09090B] hover:bg-neutral-800 text-[#71717A] hover:text-white rounded text-[10px] font-mono transition cursor-pointer select-none font-bold"
                             >
                               DISMISS REPORT
                             </button>
                           </div>
                         </div>

                         {/* Executive Summary panel splits */}
                         <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                           
                           {/* Left: Summary text (8 cols) */}
                           <div className="md:col-span-8 space-y-4">
                             <div className="space-y-1">
                               <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#71717A] font-bold">1. Executive Overview Analysis</h4>
                               <p className="text-xs text-[#A1A1AA] leading-relaxed font-sans bg-[#09090B] border border-[#27272A] p-4 rounded-lg">
                                 {compiledReport.executiveSummary}
                               </p>
                             </div>

                             <div className="space-y-1">
                               <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#71717A] font-bold">2. SLA Compliance Assessment</h4>
                               <p className="text-xs text-[#A1A1AA] leading-relaxed font-sans bg-[#09090B] border border-[#27272A] p-4 rounded-lg">
                                 {compiledReport.slaPerformance}
                               </p>
                             </div>
                           </div>

                           {/* Right: Health Check list (4 cols) */}
                           <div className="md:col-span-4 rounded-xl bg-[#09090B] border border-[#27272A] p-4 flex flex-col justify-between select-none">
                             <div className="space-y-3">
                               <span className="text-[9px] font-mono uppercase tracking-widest text-[#71717A] block font-bold">Risk Assessment matrix</span>
                               
                               <div className="p-3.5 rounded-lg bg-[#18181B] border border-[#27272A] flex items-center justify-between">
                                 <span className="text-xs font-semibold text-[#A1A1AA]">Systems Impacted</span>
                                 <span className="text-sm font-bold text-white">{compiledReport.riskEvaluation.systemsImpactedCount } core assets</span>
                               </div>

                               <div className="p-3.5 rounded-lg bg-[#18181B] border border-[#27272A] flex flex-col gap-1.5">
                                 <span className="text-[9px] font-mono text-[#71717A]">Security / Hazard Index</span>
                                 <span className={`text-sm font-bold uppercase ${
                                   compiledReport.riskEvaluation.overallRisk === "CRITICAL" ? "text-red-400" :
                                   compiledReport.riskEvaluation.overallRisk === "HIGH" ? "text-amber-400" :
                                   "text-emerald-400"
                                 }`}>
                                   ● {compiledReport.riskEvaluation.overallRisk} RISK
                                 </span>
                               </div>
                             </div>

                             <p className="text-[10px] text-[#71717A] font-sans italic leading-normal pt-4 mt-4 border-t border-[#27272A]">
                               {compiledReport.riskEvaluation.description}
                             </p>
                           </div>

                         </div>

                         {/* List of active key incidents summarized */}
                         <div className="space-y-3">
                           <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#71717A] font-bold border-b border-[#27272A] pb-1.5">3. Incident Ledger Audited Logs</h4>
                           <div className="space-y-2">
                             {compiledReport.keyIncidentsSummarized.map((ki) => (
                               <div 
                                 key={ki.id}
                                 className="flex justify-between items-center rounded-lg bg-[#09090B] border border-[#27272A] p-3 text-xs"
                               >
                                 <div className="flex items-center gap-3">
                                   <span className={`text-[10px] px-1.5 py-0.2 rounded border font-bold font-mono ${
                                     ki.severity === "CRITICAL" ? "text-red-400 bg-red-950/20 border-red-900" : "text-[#00A3FF] bg-[#00A3FF]/10 border-[#00A3FF]/45"
                                   }`}>
                                     {ki.severity}
                                   </span>
                                   <span className="font-semibold text-[#A1A1AA]">{ki.title}</span>
                                 </div>
                                 <span className="text-[10px] text-zinc-500 font-mono italic">{ki.resolutionState}</span>
                               </div>
                             ))}
                           </div>
                         </div>

                         {/* Long term preventative suggestions */}
                         <div className="rounded-xl bg-[#00A3FF]/10 border border-[#00A3FF]/30 p-4 space-y-3 relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-radial from-[#00A3FF]/10 to-transparent pointer-events-none" />
                           <div className="flex items-center gap-2 text-[#00A3FF]">
                             <Sparkles className="h-4 w-4" />
                             <h5 className="text-xs font-bold font-mono uppercase tracking-wider">AI Operations Long-Term Preventative Advice</h5>
                           </div>
                           <div className="space-y-2 pt-1 font-sans">
                             {compiledReport.aiRecommendations.map((rec, rIdx) => (
                               <div key={rIdx} className="flex items-start gap-2.5 text-xs text-[#A1A1AA] leading-relaxed">
                                 <span className="h-4 w-4 shrink-0 rounded-full bg-[#00A3FF]/20 text-[#00A3FF] border border-[#00A3FF]/40 flex items-center justify-center font-bold font-mono text-[9px] mt-0.5">
                                   {rIdx + 1}
                                 </span>
                                 <span>{rec}</span>
                               </div>
                             ))}
                           </div>
                         </div>

                       </motion.div>
                     )}
                   </div>
                 )}

               </div>

               {/* -------------------------------------------------------------
                * SIDEBAR: COMPACT COLLAPSIBLE PERSISTENT AI COPILOT
                * ------------------------------------------------------------- */}
               {isCopilotCollapsibleOpen && (
                 <div className="lg:col-span-4 h-[590px]">
                   <CopilotChat 
                     organizationId={activeOrgId} 
                     userRole={userRole} 
                     onNotify={triggerNotification} 
                   />
                 </div>
               )}

             </div>

             {/* Collapsible copilot float switch button */}
             <button
               onClick={() => setIsCopilotCollapsibleOpen(!isCopilotCollapsibleOpen)}
               className="fixed bottom-6 right-6 z-20 flex items-center justify-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider bg-[#18181B] hover:bg-[#27272A] text-[#00A3FF] border border-[#27272A] p-3 rounded-full hover:shadow-2xl hover:scale-105 transition-all cursor-pointer"
             >
               <Sparkles className="h-4.5 w-4.5 text-[#00A3FF] animate-pulse" />
               <span>{isCopilotCollapsibleOpen ? "Hide AI Copilot" : "Recall AI Copilot"}</span>
             </button>

           </div>
         )}
       </AnimatePresence>

       {/* Footer System Status Bar */}
       <footer className="h-10 bg-[#18181B] border-t border-[#27272A] flex items-center px-6 justify-between select-none text-[9px] font-mono text-[#71717A] mt-auto">
         <div className="flex items-center gap-4">
           <span>FORGE-OPS V4.2.0</span>
           <span>SESSION_TOKEN: AE-29-DF-X8</span>
           <span className="text-[#10B981] font-bold animate-pulse">● CONNECTED</span>
         </div>
         <div className="flex items-center gap-3">
           <span>MEM: 1.28 GB</span>
           <span>LATENCY: 5ms</span>
           <span>UTC LOCAL CORE</span>
         </div>
       </footer>

      {/* Sliding SRE Runbook Detail Drawer */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-30 flex justify-end font-sans">
            {/* Clickable background backdrop underlay layer */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" 
              onClick={() => { setSelectedIncident(null); syncServerData(); }} 
            />
            
            {/* Interactive sliding drawer body */}
            <div className="relative w-full max-w-xl h-full shadow-2xl z-40 bg-[#18181B]">
              <IncidentSreRunbook
                incident={selectedIncident}
                onClose={() => { setSelectedIncident(null); syncServerData(); }}
                onRefreshIncident={(updated) => setSelectedIncident(updated)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
