import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  X, ShieldAlert, CheckCircle2, AlertTriangle, Clock, User, 
  Terminal, Sparkles, Send, RefreshCw, Layers 
} from "lucide-react";
import { Incident, SeverityType, StatusType } from "../types";

interface IncidentSreRunbookProps {
  incident: Incident;
  onClose: () => void;
  onRefreshIncident: (updated: Incident) => void;
}

export default function IncidentSreRunbook({ incident, onClose, onRefreshIncident }: IncidentSreRunbookProps) {
  const [newLogText, setNewLogText] = useState("");
  const [activeStatus, setActiveStatus] = useState<StatusType>(incident.status);
  const [activeAssignee, setActiveAssignee] = useState(incident.assignee);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});

  const handleStatusChange = async (status: StatusType) => {
    setActiveStatus(status);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          timelineEvent: `Operator shifted system resolution status registry to [${status}].`
        })
      });
      if (res.ok) {
        const updated = await res.json();
        onRefreshIncident(updated);
      }
    } catch (err) {
      console.error("Failed to update status on server:", err);
    }
  };

  const handleAssigneeChange = async (name: string) => {
    setActiveAssignee(name);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignee: name,
          timelineEvent: `Triage handover completed. Node assigned to SRE: ${name}.`
        })
      });
      if (res.ok) {
        const updated = await res.json();
        onRefreshIncident(updated);
      }
    } catch (err) {
      console.error("Failed to update assignee:", err);
    }
  };

  const submitLogEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogText.trim()) return;

    try {
      const res = await fetch(`/api/incidents/${incident.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timelineEvent: newLogText,
          author: "Lead Console Operator"
        })
      });

      if (res.ok) {
        const updated = await res.json();
        onRefreshIncident(updated);
        setNewLogText("");
      }
    } catch (err) {
      console.error("Failed to log custom entry:", err);
    }
  };

  const triggerGeminiDiagnosis = async () => {
    setIsDiagnosing(true);
    setAiReport(null);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/ai-diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        setAiReport(data.diagnosis);
        onRefreshIncident(data.incident);
      }
    } catch (err) {
      console.error("Dynamic diagnostic query failed:", err);
      setAiReport("Network fail. Alternate microcomputer nodes did not return standard metadata schemas.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const toggleActionItem = (idx: number) => {
    setCompletedActions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const getSeverityStyle = (sev: SeverityType) => {
    switch (sev) {
      case "CRITICAL":
        return "text-red-400 bg-red-950/40 border-red-900";
      case "HIGH":
        return "text-amber-400 bg-amber-950/40 border-amber-900";
      case "MEDIUM":
        return "text-cyan-400 bg-cyan-950/40 border-cyan-900";
      default:
        return "text-zinc-400 bg-zinc-900/60 border-zinc-800";
    }
  };

  const getStatusBadge = (stat: StatusType) => {
    switch (stat) {
      case "CLOSED":
        return "bg-emerald-950 text-emerald-400 border border-emerald-800";
      case "RESOLVING":
        return "bg-teal-950 text-teal-400 border border-teal-800";
      case "INVESTIGATING":
        return "bg-indigo-950 text-indigo-400 border border-indigo-800 animate-pulse";
      case "TRIAGED":
        return "bg-cyan-950 text-cyan-400 border border-cyan-800";
      default:
        return "bg-rose-950 text-rose-400 border border-rose-800";
    }
  };

  return (
    <motion.div
      id={`drawer-runbook-${incident.id}`}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="flex flex-col h-full bg-[#18181B] border-l border-[#27272A] text-zinc-100 shadow-2xl overflow-y-auto"
    >
      {/* 1. Header Navigation banner */}
      <div className="flex items-center justify-between border-b border-[#27272A] bg-[#09090B]/60 p-5 sticky top-0 backdrop-blur-md z-10 font-sans">
        <div className="flex flex-col gap-1 font-sans">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getSeverityStyle(incident.severity)}`}>
              {incident.severity}
            </span>
            <span className="text-xs text-[#71717A] font-mono">ID: {incident.id}</span>
          </div>
          <h2 className="text-base font-bold text-white tracking-wide mt-1">{incident.title}</h2>
        </div>
        <button 
          onClick={onClose}
          className="rounded-lg py-1.5 px-3 border border-[#27272A] hover:border-[#71717A] hover:bg-[#27272A] text-[#71717A] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold select-none"
        >
          <X className="h-4 w-4" />
          <span>Close</span>
        </button>
      </div>

      {/* 2. Primary Layout Workspace */}
      <div className="flex-1 p-5 space-y-6">
        
        {/* State Controllers Group */}
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-[#09090B] p-4 border border-[#27272A]">
          <div>
            <label className="text-[10px] font-mono tracking-wider font-bold text-[#71717A] uppercase block mb-1.5">Operational Lifecycle Status</label>
            <select
              value={activeStatus}
              onChange={(e) => handleStatusChange(e.target.value as StatusType)}
              className={`w-full rounded-lg text-xs font-semibold py-2 px-3 bg-[#18181B] border border-[#27272A] focus:outline-none focus:border-[#71717A] transition cursor-pointer ${getStatusBadge(activeStatus)}`}
            >
              <option value="OPEN">🔴 OPEN</option>
              <option value="TRIAGED">🔵 TRIAGED</option>
              <option value="INVESTIGATING">🟣 INVESTIGATING</option>
              <option value="RESOLVING">🟢 RESOLVING</option>
              <option value="CLOSED">✅ CLOSED / RESOLVED</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono tracking-wider font-bold text-[#71717A] uppercase block mb-1.5">Lead SRE Assignee</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={activeAssignee}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                placeholder="Assignee SRE..."
                className="w-full rounded-lg text-xs font-mono py-2 px-3 bg-[#18181B] border border-[#27272A] focus:outline-none focus:border-zinc-650 text-white"
              />
            </div>
          </div>
        </div>

        {/* System Summary Description text */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-mono uppercase tracking-widest text-[#71717A] font-bold border-b border-[#27272A] pb-1">Triage Log Details</h4>
          <p className="text-xs text-[#A1A1AA] font-sans leading-relaxed bg-[#09090B] p-3 rounded-lg border border-[#27272A]">
            {incident.description}
          </p>
        </div>

        {/* AI summary or autopilot playbooks */}
        {incident.aiSummary && (
          <div className="rounded-xl bg-[#00A3FF]/10 border border-[#00A3FF]/30 p-4 space-y-3 relative overflow-hidden font-sans">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-radial from-[#00A3FF]/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 text-[#00A3FF]">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <h5 className="text-xs font-bold font-mono uppercase tracking-wider">Automated Playbook Advisory</h5>
            </div>
            <p className="text-xs text-zinc-350 italic font-sans leading-relaxed">
              &ldquo;{incident.aiSummary}&rdquo;
            </p>
            {incident.aiActions && incident.aiActions.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#00A3FF] block font-bold">Recommended Mitigation Checklist</span>
                <div className="space-y-1.5">
                  {incident.aiActions.map((act, aIdx) => (
                    <div 
                      key={aIdx} 
                      onClick={() => toggleActionItem(aIdx)}
                      className="flex items-start gap-2.5 cursor-pointer hover:bg-[#09090B] p-1 rounded transition-all group animate-fade-in"
                    >
                      <input
                        type="checkbox"
                        checked={!!completedActions[aIdx]}
                        readOnly
                        className="mt-0.5 rounded border-[#27272A] text-[#00A3FF] focus:ring-[#00A3FF] focus:ring-offset-[#18181B] bg-[#09090B]"
                      />
                      <span className={`text-[11px] leading-snug transition-all ${completedActions[aIdx] ? 'line-through text-zinc-650' : 'text-[#A1A1AA] group-hover:text-white'}`}>
                        {act}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gemini Diagnostic Shell Trigger */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-[#71717A] font-bold">Automated SRE Diagnostics</h4>
            {aiReport && (
              <button 
                onClick={() => setAiReport(null)}
                className="text-[10px] text-[#71717A] hover:text-zinc-400 font-mono cursor-pointer"
              >
                Clear diagnostics console
              </button>
            )}
          </div>

          {!aiReport ? (
            <button
              onClick={triggerGeminiDiagnosis}
              disabled={isDiagnosing}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#00A3FF]/40 bg-[#00A3FF]/15 hover:bg-[#00A3FF]/25 disabled:opacity-50 font-bold text-xs tracking-wider uppercase text-white transition-all cursor-pointer shadow-xl"
            >
              {isDiagnosing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-[#00A3FF]" />
                  Generating system diagnostics assessment...
                </>
              ) : (
                <>
                  <Terminal className="h-4 w-4 text-[#00A3FF] animate-pulse" />
                  Request Automated SRE Diagnostic Analysis
                </>
              )}
            </button>
          ) : (
            <div className="rounded-xl border border-[#27272A] bg-[#09090B] p-4 font-sans shadow-2xl relative">
              <div className="absolute top-2.5 right-2.5 text-[9px] text-[#71717A] tracking-wider font-mono">CO-PILOT SRE DIRECTIVE</div>
              <div className="text-zinc-350 text-xs tracking-tight leading-relaxed max-h-96 overflow-y-auto space-y-3 pr-1 markdown-body scrollbar-thin">
                {/* Parse key headings and numbers to render beautifully */}
                {aiReport.split("\n").map((line, lIdx) => {
                  const cleanLine = line.trim();
                  const isSreHeader = [
                    "Summary", 
                    "Observed Signals", 
                    "Potential Cause", 
                    "Probable Cause", 
                    "Impact", 
                    "Operational Impact", 
                    "Recommended Actions", 
                    "Risk Level", 
                    "Confidence Score", 
                    "Confidence"
                  ].includes(cleanLine);
                  
                  if (isSreHeader) {
                    return (
                      <h4 key={lIdx} className="text-white font-bold tracking-wider mt-4.5 mb-1.5 text-[11px] uppercase border-b border-[#27272A] pb-1 text-[#00A3FF] font-mono flex items-center gap-1.5 select-none">
                        <span className="h-1 w-1 bg-[#00A3FF] rounded-full shrink-0" />
                        {cleanLine}
                      </h4>
                    );
                  }
                  const headingMatch = line.match(/^(\d+\.\s+.*)/);
                  if (headingMatch) {
                    return <h4 key={lIdx} className="text-white font-bold tracking-wide mt-4 text-xs border-b border-[#27272A] pb-1 text-[#00A3FF] font-sans">{line}</h4>;
                  }
                  if (line.startsWith("### ")) {
                    return <h4 key={lIdx} className="text-white font-bold tracking-wide mt-3 text-xs border-b border-[#27272A] pb-1 text-[#00A3FF] font-sans">{line.replace("### ", "")}</h4>;
                  }
                  if (line.startsWith("#### ")) {
                    return <h5 key={lIdx} className="text-white font-bold mt-2 text-xs text-cyan-400 font-sans">{line.replace("#### ", "")}</h5>;
                  }
                  if (line.startsWith("- ")) {
                    return <li key={lIdx} className="list-disc ml-4 text-[#A1A1AA] text-[11px] leading-relaxed pb-0.5">{line.replace("- ", "")}</li>;
                  }
                  if (line.startsWith("```")) {
                    return null; // Don't show raw backticks
                  }
                  if (line.trim() === "") {
                    return <div key={lIdx} className="h-1" />;
                  }
                  return <p key={lIdx} className="text-[#A1A1AA] text-[11px] leading-relaxed">{line}</p>;
                })}
              </div>
            </div>
          )}
        </div>

        {/* Timeline chronological audit trail */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-mono uppercase tracking-widest text-[#71717A] font-bold border-b border-[#27272A] pb-1">Incident Timeline Audit Log</h4>
          
          <form onSubmit={submitLogEntry} className="flex gap-2">
            <input
              type="text"
              value={newLogText}
              onChange={(e) => setNewLogText(e.target.value)}
              placeholder="Log status observation..."
              className="flex-1 rounded-lg text-xs font-sans py-2 px-3 bg-[#09090B] border border-[#27272A] focus:outline-none focus:border-[#71717A] text-white placeholder:text-zinc-650"
            />
            <button
              type="submit"
              className="p-2 rounded-lg bg-[#27272A] hover:bg-[#3f3f46] text-[#A1A1AA] hover:text-white border border-[#27272A] transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <div className="space-y-4 pt-1 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#27272A] pointer-events-none select-none">
            {incident.timeline.map((evt, idx) => (
              <div key={idx} className="flex items-start gap-3 relative">
                <div className="h-6 w-6 rounded-full bg-[#09090B] border border-[#27272A] flex items-center justify-center z-10 text-[9px] font-mono text-[#71717A]">
                  {idx + 1}
                </div>
                <div className="flex-1 bg-[#09090B] border border-[#27272A]/80 p-3 rounded-xl space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#71717A]">
                      {new Date(evt.time).toLocaleTimeString()} ({new Date(evt.time).toLocaleDateString([], {month: 'numeric', day: 'numeric'})})
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#18181B] text-[#71717A] border border-[#27272A] w-fit">
                      {evt.author}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed font-sans">{evt.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clear Exit / Dismiss Action trigger */}
        <div className="pt-6 border-t border-[#27272A] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 py-2 px-5 bg-[#27272A] hover:bg-[#3f3f46] text-[#A1A1AA] hover:text-white border border-[#27272A] rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition select-none shadow"
          >
            <X className="h-4 w-4 text-[#71717A]" />
            <span>Close Triage Playbook Layout</span>
          </button>
        </div>

      </div>
    </motion.div>
  );
}
