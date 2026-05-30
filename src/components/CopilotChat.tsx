import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, Sparkles, Terminal, Layers, RefreshCw, X, 
  Cpu, ShieldAlert, CheckCircle2, AlertTriangle, BookOpen, User 
} from "lucide-react";
import { CopilotMessage } from "../types";

interface CopilotChatProps {
  organizationId: string;
  userRole: string;
  onNotify: (msg: string, status: "success" | "error" | "warning") => void;
}

export default function CopilotChat({ organizationId, userRole, onNotify }: CopilotChatProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "init-msg",
      role: "assistant",
      content: `### 🖥️ SRE Operations Assistant Online

System metrics and active telemetry streams are fully synced. Operational reference guidelines are loaded in the semantic indexes.

Specify any active incident or input a query (e.g., "edge gateway buffer saturation" or "coolant feed manifold pressure transient") to fetch diagnosis and recommended runbook steps.`,
      timestamp: new Date().toISOString()
    }
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMsgText = inputMessage;
    setInputMessage("");

    const newUserMessage: CopilotMessage = {
      id: `usr-msg-${Date.now()}`,
      role: "user",
      content: userMsgText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, newUserMessage],
          organizationId,
          userRole
        })
      });

      if (res.ok) {
        const replyMsg = await res.json();
        setMessages(prev => [...prev, replyMsg]);
      } else {
        onNotify("Failed to communicate with semantic inference servers.", "error");
      }
    } catch (err) {
      console.error(err);
      onNotify("Copilot routing failure. Connection to central nodes refused.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getSystemRoleBadge = (role: string) => {
    switch (role) {
      case "user":
        return <span className="text-[#a1a1aa] font-mono text-[9px] uppercase tracking-wider bg-[#09090B] border border-[#27272A] py-0.5 px-2 rounded">Operator</span>;
      default:
        return (
          <span className="text-[#00A3FF] font-mono text-[9px] uppercase tracking-wider bg-[#00A3FF]/10 border border-[#00A3FF]/40 py-0.5 px-2 rounded flex items-center gap-1">
            Copilot
          </span>
        );
    }
  };

  return (
    <div id="sidebar-copilot" className="flex flex-col h-full border border-[#27272A] rounded-xl bg-[#18181B] shadow-2xl relative overflow-hidden">
      
      {/* Copilot Header */}
      <div className="flex items-center justify-between border-b border-[#27272A] bg-[#09090B]/40 px-4 py-3.5 select-none font-sans">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#00A3FF] animate-pulse" />
          <Sparkles className="h-4.5 w-4.5 text-[#00A3FF] animate-pulse" />
          <h3 className="text-xs font-bold tracking-wider text-white uppercase">ForgeOps AI Copilot</h3>
        </div>
        <span className="text-[9px] font-mono text-[#71717A] tracking-widest hidden sm:inline">
          MODEL: gemini-3.5-flash
        </span>
      </div>

      {/* Chat Messages Panel */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-thin">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div className="flex items-center gap-2 mb-1 pointer-events-none">
              {msg.role === "user" ? (
                <>
                  <span className="text-[10px] text-[#71717A] font-mono">{userRole || "Operator"}</span>
                  {getSystemRoleBadge("user")}
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 text-[#00A3FF] animate-pulse" />
                  <span className="text-[10px] text-[#71717A] font-mono">SRE Operations Assistant</span>
                  {getSystemRoleBadge("assistant")}
                </>
              )}
            </div>

            <div className={`rounded-xl p-3.5 max-w-[90%] text-xs leading-relaxed font-sans border shadow-md space-y-2.5 selection:bg-[#00A3FF]/20 ${
              msg.role === "user" 
                ? "bg-[#09090B] text-[#A1A1AA] border-[#27272A]" 
                : "bg-[#09090B]/50 border-[#27272A] text-zinc-300"
            }`}>
              
              {/* If Assistant role message, parse beautiful markdown formats */}
              {msg.role === "assistant" ? (
                <div className="space-y-3 font-sans pr-1">
                  {msg.content.split("\n").map((line, lIdx) => {
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
                    if (line.startsWith("### ")) {
                      return <h4 key={lIdx} className="text-white font-bold tracking-wide mt-3 text-xs border-b border-[#27272A] pb-1 text-[#00A3FF]">{line.replace("### ", "")}</h4>;
                    }
                    if (line.startsWith("#### ")) {
                      return <h5 key={lIdx} className="text-white font-bold text-xs mt-2 text-cyan-400">{line.replace("#### ", "")}</h5>;
                    }
                    if (line.startsWith("- ")) {
                      return <li key={lIdx} className="list-disc ml-4 text-[#A1A1AA] text-[11px] leading-relaxed/snug">{line.replace("- ", "")}</li>;
                    }
                    if (line.startsWith("```")) {
                      return null; // Skip raw backticks
                    }
                    if (line.startsWith("$ ")) {
                      return (
                        <div key={lIdx} className="bg-black border border-[#27272A] p-2 text-[10px] text-[#00A3FF] rounded-lg selection:bg-[#00A3FF]/20 my-1 font-mono">
                          {line}
                        </div>
                      );
                    }
                    return <p key={lIdx} className="text-[11.5px] text-[#A1A1AA] leading-snug">{line}</p>;
                  })}
                </div>
              ) : (
                <p className="whitespace-pre-line text-[#A1A1AA] font-medium">{msg.content}</p>
              )}

              {/* Grounded RAG info tags */}
              {msg.isRagExpanded && msg.ragSources && msg.ragSources.length > 0 && (
                <div className="pt-2 border-t border-[#27272A] mt-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#00A3FF] font-semibold mb-1">
                    <BookOpen className="h-3.5 w-3.5 text-[#00A3FF]" />
                    <span>Cited Reference Materials:</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    {msg.ragSources.map((src, sIdx) => (
                      <div 
                        key={sIdx}
                        className="flex items-center gap-1.5 text-[10px] bg-[#09090B] text-[#A1A1AA] border border-[#27272A] px-2 py-0.5 rounded"
                      >
                        <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-mono text-[9px] text-[#A1A1AA] truncate">{src}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
            <span className="text-[8px] font-mono text-zinc-650 mt-1 mr-1 pointer-events-none select-none">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col gap-1 items-start select-none font-sans">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3 w-3 text-[#00A3FF] animate-pulse" />
              <span className="text-[10px] text-[#71717A] font-mono">ForgeOps SRE Core</span>
              {getSystemRoleBadge("assistant")}
            </div>
            <div className="rounded-xl p-4 bg-[#09090B]/50 border border-[#27272A] text-xs text-[#71717A] font-mono flex items-center gap-2.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#00A3FF]" />
              Correlating system matrices & vector SOP libraries...
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Message Typing Form */}
      <form onSubmit={handleSendMessage} className="border-t border-[#27272A] p-3 bg-[#09090B]/60 flex gap-2 font-sans">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`Speak to SRE Core... (${userRole})`}
          disabled={isLoading}
          className="flex-1 rounded-lg text-xs py-2 px-3 bg-[#09090B] border border-[#27272A] focus:outline-none focus:border-[#71717A] text-white placeholder:text-zinc-650 font-medium"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="p-2.5 rounded-lg bg-[#00A3FF]/15 border border-[#00A3FF]/40 text-white hover:bg-[#00A3FF]/25 disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send className="h-4 w-4 text-[#00A3FF]" />
        </button>
      </form>
    </div>
  );
}
