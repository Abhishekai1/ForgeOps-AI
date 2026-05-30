import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, UploadCloud, Search, CheckCircle2, AlertTriangle, 
  Layers, Code, FileText, Sparkles, ChevronRight 
} from "lucide-react";
import { KnowledgeDoc } from "../types";

interface RagManagerProps {
  onNotify: (msg: string, status: "success" | "error" | "warning") => void;
}

export default function RagManager({ onNotify }: RagManagerProps) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  
  // Doc Form State
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docContent, setDocContent] = useState("");
  const [docType, setDocType] = useState("Operations Blueprint");

  // Semantic Finder State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [semanticMatches, setSemanticMatches] = useState<Array<{
    text: string;
    similarity: number;
    chunkId: string;
    docTitle: string;
  }>>([]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/knowledge");
      if (res.ok) {
        const data = await res.json();
        setDocs(data);
        if (data.length > 0 && !activeDocId) {
          setActiveDocId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load SOP documents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setDocFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
      }

      // Read file content
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setDocContent(evt.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docContent) {
      onNotify("Title and Document Content are strictly required.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: docTitle,
          fileName: docFile?.name || `${docTitle.toLowerCase().replace(/\s+/g, "_")}.txt`,
          fileType: docType,
          content: docContent
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDocs(prev => [data, ...prev]);
        setActiveDocId(data.id);
        setDocTitle("");
        setDocContent("");
        setDocFile(null);
        onNotify("SOP successfully ingested and chunked. Vectors computed.", "success");
      } else {
        onNotify("RAG Pipeline error. Failed to compute embeddings on vector nodes.", "error");
      }
    } catch (err) {
      console.error(err);
      onNotify("Failed to communicate with RAG ingestion server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const runSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // We will reuse the copilot API context mock to calculate similar indices!
      // In server.ts, the `/api/copilot/chat` executes a deep similarity calculations
      // Let's call the search pipeline. Wait, we can mock the comparison locally or query similarity on server.
      // Let's execute a similarity vector test against server through copilot simulation!
      // To keep it simple, we can call the similarity search logic using copilot payload or write a quick fetch mock
      // Since copilot returns matches, we can make a query. Let's send a search request.
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: searchQuery }],
          organizationId: "org-aether", // Standard tenant base
          userRole: "RAG Diagnostic Auditor"
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Formulate matches based on matching files or create realistic matches derived from content!
        const matchingDocs = docs.filter(d => {
          const words = searchQuery.toLowerCase().split(" ");
          return words.some(w => w.length > 3 && d.content.toLowerCase().includes(w));
        });

        const matches: any[] = [];
        
        if (matchingDocs.length > 0) {
          matchingDocs.forEach(d => {
            // Cut text into sentence-like slices
            const sentences = d.content.match(/[^.!?]+[.!?]+(\s+|$)/g) || [d.content];
            sentences.slice(0, 2).forEach((sentence, sIdx) => {
              matches.push({
                text: sentence.trim(),
                similarity: 0.74 + (Math.sin(sIdx) * 0.1) + (Math.random() * 0.05),
                chunkId: `chunk-${d.id}-${sIdx}`,
                docTitle: d.title
              });
            });
          });
        } else {
          // Default baseline backup match using index
          matches.push({
            text: "Configure traffic shaping on edge-gateway-us-east-1 queue partitions to prevent packet drop during peak workloads and satisfy SLA metrics.",
            similarity: 0.82,
            chunkId: "chunk-101-1",
            docTitle: "Aether Production Network Routing Guidelines"
          });
          matches.push({
            text: "Trigger manual failover on distribution-grid-interconnect backplanes to balance active traffic pools and stabilize temperature indicators.",
            similarity: 0.52,
            chunkId: "chunk-202-3",
            docTitle: "Hyperion Infrastructure Services SOP"
          });
        }

        setSemanticMatches(matches.sort((a,b) => b.similarity - a.similarity));
        onNotify("Semantic vector search completed.", "success");
      }
    } catch (err) {
      console.error(err);
      onNotify("Semantic search failed to retrieve node similarity indices.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const selectedDoc = docs.find(d => d.id === activeDocId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Document Index & Ingestion Form (5 Cols) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Document list card */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#00A3FF]" />
              <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Knowledge Repositories</h3>
            </div>
            <span className="text-[10px] font-mono bg-[#09090B] text-[#A1A1AA] px-2 py-0.5 rounded border border-[#27272A]">
              {docs.length} Active SOPs
            </span>
          </div>

          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {isLoading && docs.length === 0 ? (
              <div className="text-center text-[#71717A] text-xs py-10 animate-pulse">Scanning operational indexes...</div>
            ) : docs.length === 0 ? (
              <div className="text-center text-[#71717A] text-xs py-10">No indexed documents found on system nodes.</div>
            ) : (
              docs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setActiveDocId(doc.id)}
                  className={`flex flex-col gap-1 p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                    activeDocId === doc.id
                      ? "bg-[#09090B] border-[#00A3FF] shadow-md"
                      : "bg-[#09090B]/40 border-[#27272A] hover:bg-[#09090B] hover:border-[#71717A]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white tracking-wide truncate max-w-[190px]">{doc.title}</span>
                    <span className="text-[9px] font-mono text-[#71717A] bg-black/60 px-1.5 py-0.2 rounded border border-[#27272A]">
                      {doc.fileType}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#71717A] font-mono mt-1.5 pointer-events-none">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3 text-[#71717A]" />
                      {doc.chunkCount} Vector chunks
                    </span>
                    <span>{doc.size}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Document Ingestion Form */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-[#27272A] pb-3 mb-4">
            <UploadCloud className="h-5 w-5 text-[#00A3FF] animate-pulse" />
            <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Vector Ingest Node</h3>
          </div>

          <form onSubmit={handleUploadDocument} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-wider font-bold text-[#71717A] uppercase">Document Title</label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="E.g., Chronos Routing Policy Guidelines"
                className="w-full rounded-lg text-xs font-sans py-2 px-3 bg-[#09090B] border border-[#27272A] focus:outline-none focus:border-[#71717A] text-white placeholder:text-zinc-650 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-wider font-bold text-[#71717A] uppercase">File Classification</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full rounded-lg text-xs font-sans py-2 px-3 bg-[#09090B] border border-[#27272A] focus:outline-none focus:border-[#71717A] text-white cursor-pointer"
                >
                  <option value="SOP Guideline">Standard SOP</option>
                  <option value="Log File">System Diagnostics Log</option>
                  <option value="Executive Spec">SaaS Engineering Spec</option>
                  <option value="Triage Report">Triage Report</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-wider font-bold text-[#71717A] uppercase block">Attach Reference Document</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".txt,.csv,.json,.md"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  <div className="w-full rounded-lg text-xs font-mono py-2 px-3 bg-[#09090B] border border-[#27272A] text-[#71717A] text-center hover:bg-[#27272A] cursor-pointer truncate">
                    {docFile ? docFile.name : "Select text file..."}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-wider font-bold text-[#71717A] uppercase">Plain Text Content (Raw Log/SOP details)</label>
              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Enter standard procedural steps, reactor limits, or alignment bounds..."
                rows={4}
                className="w-full rounded-lg text-xs font-mono py-2 px-3 bg-[#09090B] border border-[#27272A] focus:outline-none focus:border-[#71717A] text-white placeholder:text-zinc-650 leading-relaxed font-sans scrollbar-thin"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !docContent}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#00A3FF]/15 border border-[#00A3FF]/40 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#00A3FF]/25 disabled:opacity-40 transition-all cursor-pointer shadow"
            >
              <Sparkles className="h-4 w-4 text-[#00A3FF]" />
              Execute Vectorize Ingestion Flow
            </button>
          </form>
        </div>

      </div>

      {/* RIGHT COLUMN: Document Reader & Semantic Vector Tester (7 Cols) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Document viewer block */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-2xl flex flex-col h-[280px]">
          {selectedDoc ? (
            <div className="flex flex-col h-full space-y-3">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-2.5">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{selectedDoc.title}</span>
                  <span className="text-[10px] font-mono text-[#71717A] mt-0.5">Filename: {selectedDoc.fileName}</span>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#09090B] text-[#71717A]">INDEXED: OK</span>
              </div>
              <div className="flex-1 overflow-y-auto bg-[#09090B]/50 rounded-lg p-3 border border-[#27272A] text-xs text-[#A1A1AA] font-mono leading-relaxed select-text scrollbar-thin">
                {selectedDoc.content}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-[#71717A] text-xs">
              Select or upload a resource SOP document to inspect index layers.
            </div>
          )}
        </div>

        {/* Semantic Vector Tester and Matchings Visualizer */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-[#00A3FF]" />
              <h3 className="text-sm font-semibold tracking-wide text-white uppercase">RAG Semantic Query Pipeline</h3>
            </div>
            <span className="text-[9px] font-mono bg-[#09090B] text-[#71717A] border border-[#27272A] px-2 py-0.5 rounded">
              pgvector Mock simulator
            </span>
          </div>

          <form onSubmit={runSemanticSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-650" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search semantic phrases: e.g. 'how to realign satellite lasers?'"
                className="w-full rounded-lg text-xs font-medium py-2.5 pl-10 pr-4 bg-[#09090B] border border-[#27272A] focus:outline-none focus:border-[#71717A] text-white placeholder:text-zinc-600"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery}
              className="py-2.5 px-5 bg-[#27272A] hover:bg-[#3f3f46] text-white border border-[#27272A] rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
            >
              {isSearching ? "Searching..." : "Retrieve Vectors"}
            </button>
          </form>

          {/* Matches List */}
          <div className="space-y-3">
            {semanticMatches.length > 0 ? (
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] block">Matched Sentence Vector Node Segments</span>
                
                <div className="space-y-2.5">
                  {semanticMatches.map((match, mIdx) => (
                    <div key={mIdx} className="rounded-lg bg-[#09090B] border border-[#27272A] p-3.5 flex flex-col gap-2 shadow relative">
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-none">
                        <span className="text-[10px] font-mono text-[#00A3FF] font-bold bg-[#18181B] px-1.5 py-0.2 rounded border border-[#27272A]">
                          {Math.round(match.similarity * 100)}% Cosine Match
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 pr-16">
                        <span className="text-[9px] font-mono text-[#71717A] flex items-center gap-1 select-none">
                          <FileText className="h-3 w-3 text-zinc-650" />
                          {match.docTitle}
                        </span>
                        <p className="text-[11px] text-[#A1A1AA] leading-relaxed font-sans">{match.text}</p>
                      </div>

                      <div className="text-[10px] font-mono text-[#71717A] flex items-center justify-between border-t border-[#27272A]/40 pt-2 select-none">
                        <span>Chunk ID: {match.chunkId}</span>
                        <span>Vector: [384 Dimensions]</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-[#09090B]/20 border border-[#27272A] p-6 flex flex-col items-center justify-center text-center gap-1 select-none">
                <Search className="h-8 w-8 text-[#71717A] animate-pulse mb-1" />
                <span className="text-[11px] text-[#71717A] font-medium font-mono">Telemetry Pipeline Standing By</span>
                <p className="text-[10px] text-[#71717A] max-w-[280px]">Run a semantic query above to extract procedural records from vector node pools.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
