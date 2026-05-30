import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { 
  Tenant, 
  Incident, 
  SeverityType, 
  StatusType, 
  MetricSnapshot, 
  KnowledgeDoc, 
  DocumentChunk,
  CopilotMessage,
  OperationalReport,
  AnomalyIndex
} from "./src/types";

dotenv.config();

// Create the shared Gemini AI Client (lazy initialization check)
let apiEnabled = false;
let ai: GoogleGenAI | null = null;

if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
    apiEnabled = true;
    console.log("ForgeOps AI: Gemini operational core loaded.");
  } catch (err) {
    console.warn("ForgeOps AI: Failed to instantiate Gemini client. Operating in mock hybrid mode.", err);
  }
} else {
  console.log("ForgeOps AI: No active Gemini key found. Operating in local-semantic backup mode.");
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// -------------------------------------------------------------
// IN-MEMORY DATABASES & SIMULATED STATE ENGINE
// -------------------------------------------------------------

// Fixed standard enterprise tenants
const tenants: Tenant[] = [
  {
    id: "org-aether",
    name: "Aether Production Networks",
    sector: "Industrial Logistics & Edge Routing",
    slaTarget: 99.95,
    systems: ["production-ingestion-pipeline", "edge-gateway-us-east-1", "cluster-node-12"]
  },
  {
    id: "org-chronos",
    name: "Chronos Logistics Systems",
    sector: "Logistics & Supply Chain Automation",
    slaTarget: 99.9,
    systems: ["autonomous-route-scheduler", "scada-hub-gateway", "warehouse-line-b"]
  },
  {
    id: "org-hyperion",
    name: "Hyperion Infrastructure Services",
    sector: "Cloud Grid & Thermal Observability",
    slaTarget: 99.99,
    systems: ["coolant-feed-manifold", "distribution-grid-interconnect", "reactor-isolation-valve-system"]
  }
];

// Initial incident state pool
let incidents: Incident[] = [
  // Aether Incidents
  {
    id: "inc-101",
    title: "Edge Router Signal Quality Deviation",
    description: "Available telemetry indicates localized signal-quality degradation on edge-router-04, which appears correlated with increased retry rates during transient workload peaks.",
    severity: "CRITICAL",
    status: "INVESTIGATING",
    category: "Infrastructure Networks",
    organizationId: "org-aether",
    assignee: "John Doe (SRE Lead)",
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    timeline: [
      { time: new Date(Date.now() - 4 * 3600000).toISOString(), event: "Anomalous temperature sweep values flagged on edge gateway interface sensors.", author: "Automated SysLog" },
      { time: new Date(Date.now() - 3.5 * 3600000).toISOString(), event: "Assigned incident to John Doe. Triggered automated health check probes.", author: "System Auto-Scheduler" }
    ],
    aiSummary: "Available telemetry suggests elevated thermal variance may correlate with increased retry rates on the edge router.",
    aiActions: [
      "Verify enclosure cooling and telemetry sensors on active gateway nodes",
      "Temporarily divert traffic overflow to secondary cluster routes"
    ]
  },
  {
    id: "inc-102",
    title: "Gateway Node Climate Control Warning",
    description: "Temperature metrics registered above target warning bounds on gateway-node-02, triggering automated defensive capacity-throttling precautions.",
    severity: "HIGH",
    status: "TRIAGED",
    category: "Industrial Controls",
    organizationId: "org-aether",
    assignee: "Sarah Lin (Operations Lead)",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1.8 * 3600000).toISOString(),
    timeline: [
      { time: new Date(Date.now() - 2 * 3600000).toISOString(), event: "Internal chamber telemetry flagged temperature warning threshold delta.", author: "Automated SysLog" }
    ],
    aiSummary: "Correlated temperature alerts indicate possible cooling air damper issues may be associated with gateway capacity limits.",
    aiActions: [
      "Inspect cooling air damper actuation status",
      "Verify sensor signals against neighboring gateway nodes"
    ]
  },
  
  // Chronos Incidents
  {
    id: "inc-201",
    title: "Autonomous Route Scheduler Buffer Allocation Peak",
    description: "Buffer allocation for the autonomous route calculation pipeline peaked. System is currently experiencing queue backpressure due to dynamic route configuration settings.",
    severity: "HIGH",
    status: "OPEN",
    category: "Fleet Operations",
    organizationId: "org-chronos",
    assignee: "Amit Patel (Platform SRE)",
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    timeline: [
      { time: new Date(Date.now() - 1 * 3600000).toISOString(), event: "Route recalculation scheduler reports buffer limit warning levels on core sorting scheduler threads.", author: "System Monitor" }
    ],
    aiSummary: "Grid buffer saturation in fleet router scheduler caused by overlapping dynamic boundaries.",
    aiActions: [
      "Flush dynamic local routing table indices",
      "Deploy updated routing configuration models",
      "Temporarily adjust scheduler garbage collection thresholds"
    ]
  },
  
  // Hyperion Incidents
  {
    id: "inc-301",
    title: "Coolant Loop Pressure Regulation Transient",
    description: "Transient pressure variance observed on core cooling loops, accompanied by slower mechanical response from venting relief valves.",
    severity: "CRITICAL",
    status: "INVESTIGATING",
    category: "Utilities Infrastructure",
    organizationId: "org-hyperion",
    assignee: "Yuri Kozlov (SRE Lead)",
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 5.5 * 3600000).toISOString(),
    timeline: [
      { time: new Date(Date.now() - 6 * 3600000).toISOString(), event: "Cooling line pressure exceeded warning levels.", author: "Safety Scanners" },
      { time: new Date(Date.now() - 5.8 * 3600000).toISOString(), event: "Triggered secondary relief loop path manually.", author: "Yuri Kozlov" }
    ],
    aiSummary: "Muted pressure variance warning flagged on primary dynamic seal interfaces due to backpressure transients.",
    aiActions: [
      "Engage backup coolant pump channels to balance fluid pressure",
      "Execute safe mechanical release command sequences to test valve tolerances"
    ]
  }
];

// Continuous operational alerts/logs generated from background or triggers
let simulationFeed: Array<{
  id: string;
  timestamp: string;
  organizationId: string;
  source: string;
  message: string;
  severity: SeverityType;
  anomalyScore: number;
}> = [
  {
    id: "feed-1",
    timestamp: new Date(Date.now() - 500000).toISOString(),
    organizationId: "org-aether",
    source: "edge-router-04",
    message: "Minor signal quality deviation registered on local interface metrics.",
    severity: "LOW",
    anomalyScore: 12
  },
  {
    id: "feed-2",
    timestamp: new Date(Date.now() - 400000).toISOString(),
    organizationId: "org-chronos",
    source: "gateway-node-scada",
    message: "Data validation filter flagged trace routing packet discrepancies in gateway queues.",
    severity: "LOW",
    anomalyScore: 4
  },
  {
    id: "feed-3",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    organizationId: "org-hyperion",
    source: "telemetry-service-sensor",
    message: "Pipeline pressure metrics registered slight deviation transient below baseline operating targets.",
    severity: "HIGH",
    anomalyScore: 78
  },
  {
    id: "feed-4",
    timestamp: new Date(Date.now() - 200000).toISOString(),
    organizationId: "org-aether",
    source: "gateway-node-02-sensor",
    message: "Minor climate feedback variations registered inside server storage enclosures.",
    severity: "LOW",
    anomalyScore: 15
  },
  {
    id: "feed-5",
    timestamp: new Date(Date.now() - 100000).toISOString(),
    organizationId: "org-hyperion",
    source: "coolant-feed-manifold",
    message: "Pressure variance warning flagged on primary fluid seal conduit interfaces.",
    severity: "CRITICAL",
    anomalyScore: 92
  }
];

// Document metadata storage
let knowledgeDocs: KnowledgeDoc[] = [
  {
    id: "doc-1",
    title: "Aether Edge Router Operating Guidelines",
    fileName: "AETHER_SOP_ROUTER_CALIBRATION.pdf",
    fileType: "SOP Guideline",
    content: "Aether Production Networks edge router configuration requires standardized signal protocols. If signal quality attributes drop below recommended baseline bounds, operators must check physical telemetry metrics on edge-gateway-us-east-1, verify local temperature stabilizers, and divert active network trunk lines to secondary cloud routes to minimize queuing delay and prevent packet retransmissions.",
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    chunkCount: 2,
    size: "14.2 KB"
  },
  {
    id: "doc-2",
    title: "Hyperion Thermal Utility Pressure Regulation",
    fileName: "HYPERION_SOP_MANIFOLD_REGULATION.pdf",
    fileType: "SOP Guideline",
    content: "Hyperion Infrastructure Services thermal loop pressure regulations: Under elevated thermal accumulation in the utility distribution conduits (pressures exceeding standard operating limits), safety manifold relief valves automatically actuate. If a valve mechanism delay occurs, operators should: 1. Manually engage standby auxiliary coolant loop pumps. 2. Verify secondary temperature and flow sensors. 3. Deploy system structural release commands to clear mechanical particulate residue inside manifold valves. Do not dump core fluid unless backup steam reservoirs decline below critical operating limits.",
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    chunkCount: 2,
    size: "18.1 KB"
  }
];

// Split the default docs into default semantic chunks citing readable document sections instead of VECTOR_NODE_KEYS
let knowledgeChunks: DocumentChunk[] = [
  {
    id: "AETHER_SOP_ROUTER_CALIBRATION.pdf (SOP Section 1)",
    text: "Aether Production Networks edge router configuration requires standardized signal protocols. If signal quality drops below recommended baseline bounds, operators must check physical telemetry metrics on edge-gateway-us-east-1 and verify local temperature stabilizers."
  },
  {
    id: "AETHER_SOP_ROUTER_CALIBRATION.pdf (SOP Section 2)",
    text: "Review mounting configurations and transceiver ambient states. If packet retry rates persist, hand over traffic streams to secondary cloud routes to minimize queuing delays and prevent packet drops."
  },
  {
    id: "HYPERION_SOP_MANIFOLD_REGULATION.pdf (SOP Section 1)",
    text: "Hyperion Infrastructure Services thermal loop pressure regulations: Under elevated thermal accumulation in the utility distribution conduits (pressures exceeding standard operating limits), safety manifold relief valves automatically actuate."
  },
  {
    id: "HYPERION_SOP_MANIFOLD_REGULATION.pdf (SOP Section 2)",
    text: "Manually engage standby auxiliary coolant loop pumps. Verify secondary temperature sensors and deploy system structural release commands to clear mechanical particulate residue inside manifold valves."
  }
];

// Helper to calculate a semantic vector mockup or call Gemini if embedContent is available.
const OPERATIONAL_VOCABULARY = [
  "optical", "alignment", "transceiver", "calibration", "drift", "temperature", "climate", "cnc",
  "enclosure", "vacuum", "milling", "lathe", "precision", "pressure", "coolant", "valve",
  "manifold", "pump", "loop", "steam", "buffer", "queue", "scheduler", "route",
  "geofence", "router", "fleet", "logistics", "scada", "telemetry", "industrial", "network"
];

function generateTermVector(text: string): number[] {
  const normalized = text.toLowerCase();
  const vector = new Array(OPERATIONAL_VOCABULARY.length).fill(0);
  OPERATIONAL_VOCABULARY.forEach((term, index) => {
    const matches = (normalized.match(new RegExp(term, "g")) || []).length;
    vector[index] = matches > 0 ? 1 + 0.5 * matches : 0;
  });
  // Add L2 Normalize
  let mag = 0;
  for (let i = 0; i < vector.length; i++) mag += vector[i] * vector[i];
  mag = Math.sqrt(mag);
  if (mag > 0) {
    for (let i = 0; i < vector.length; i++) vector[i] = vector[i] / mag;
  }
  return vector;
}

// Attach embeddings to default chunks
knowledgeChunks.forEach(c => {
  c.embedding = generateTermVector(c.text);
});

// A localized cosine-similarity function
function calculateCosineSimilarity(v1: number[], v2: number[]): number {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    mA += v1[i] * v1[i];
    mB += v2[i] * v2[i];
  }
  if (mA === 0 || mB === 0) return 0;
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

// Historical dynamic metric simulator
const metricHistoryMap: Record<string, MetricSnapshot[]> = {
  "org-aether": [],
  "org-chronos": [],
  "org-hyperion": []
};

// Seed past metrics
const nowTime = Date.now();
for (let j = 0; j < 25; j++) {
  const timestamp = new Date(nowTime - (25 - j) * 30000).toISOString();
  
  // Aether metrics
  metricHistoryMap["org-aether"].push({
    timestamp,
    cpuUsage: 45 + Math.sin(j / 3) * 10 + Math.random() * 5,
    memoryUsage: 62 + Math.cos(j / 5) * 4,
    networkTraffic: 4.2 + Math.sin(j / 2) * 1.1,
    activeAlerts: j > 20 ? 2 : 1,
    slaPercentage: 99.96,
    dbLoad: 31 + Math.random() * 10,
    anomalyScore: j > 18 ? 35 : 12,
    anomalies: j > 18 ? [
      { system: "edge-router-04 signal variance", score: 82, details: "Signal quality levels dropped outside target baseline metrics", severity: "CRITICAL" }
    ] : []
  });

  // Chronos metrics
  metricHistoryMap["org-chronos"].push({
    timestamp,
    cpuUsage: 55 + Math.cos(j / 2) * 8 + Math.random() * 4,
    memoryUsage: 71 + Math.sin(j / 4) * 6,
    networkTraffic: 8.4 + Math.cos(j / 3) * 2.1,
    activeAlerts: j > 22 ? 1 : 0,
    slaPercentage: 99.92,
    dbLoad: 48 + Math.random() * 15,
    anomalyScore: j > 21 ? 64 : 8,
    anomalies: j > 21 ? [
      { system: "autonomous-route-scheduler capacity alert", score: 68, details: "Route recalculation queues backed up, elevated queue delays observed in pipelines", severity: "HIGH" }
    ] : []
  });

  // Hyperion metrics
  metricHistoryMap["org-hyperion"].push({
    timestamp,
    cpuUsage: 38 + Math.sin(j / 4) * 12 + Math.random() * 6,
    memoryUsage: 53 + Math.cos(j / 3) * 5,
    networkTraffic: 2.1 + Math.sin(j / 5) * 0.4,
    activeAlerts: j > 15 ? 1 : 1,
    slaPercentage: 99.99,
    dbLoad: 24 + Math.random() * 8,
    anomalyScore: j > 12 ? 84 : 14,
    anomalies: j > 12 ? [
      { system: "coolant-feed-manifold pressure transient", score: 88, details: "Localized pressure deviation registered on active thermal conduit lines", severity: "CRITICAL" }
    ] : []
  });
}

// Server background tick simulation
setInterval(() => {
  const tickTime = new Date().toISOString();
  tenants.forEach(tenant => {
    const history = metricHistoryMap[tenant.id];
    if (!history) return;

    // Check how many open high/critical incidents we currently have
    const activeOrgIncidents = incidents.filter(i => i.organizationId === tenant.id && i.status !== "CLOSED");
    const cryCount = activeOrgIncidents.filter(i => i.severity === "CRITICAL").length;
    const highCount = activeOrgIncidents.filter(i => i.severity === "HIGH").length;

    // SLA calculation based on open incidents
    let baseSla = tenant.slaTarget;
    if (cryCount > 0) baseSla -= (0.15 * cryCount);
    if (highCount > 0) baseSla -= (0.04 * highCount);
    const slaPercentage = Math.max(90, baseSla - Math.random() * 0.01);

    // CPU/Memory hikes based on incidents
    const cpuBump = cryCount * 25 + highCount * 12;
    const memBump = cryCount * 15 + highCount * 8;
    
    const lastEntry = history[history.length - 1];
    const newCpu = Math.min(100, Math.max(15, 40 + (Math.random() * 16 - 8) + cpuBump));
    const newMem = Math.min(100, Math.max(30, (lastEntry ? lastEntry.memoryUsage : 60) + (Math.random() * 4 - 2) + memBump));
    const newNet = Math.max(0.5, (lastEntry ? lastEntry.networkTraffic : 4) + (Math.random() * 1.6 - 0.8));
    const newDb = Math.min(100, Math.max(10, 30 + (Math.random() * 14 - 7) + (cryCount * 20)));

    let anomalyScore = 5 + Math.random() * 12;
    const anomalies: AnomalyIndex[] = [];

    // Map active incidents to live metric logs
    activeOrgIncidents.forEach(inc => {
      let score = inc.severity === "CRITICAL" ? 80 + Math.random() * 15 : 55 + Math.random() * 15;
      anomalyScore = Math.max(anomalyScore, score);
      anomalies.push({
        system: inc.title,
        score: Math.round(score),
        details: inc.description.substring(0, 75) + "...",
        severity: inc.severity
      });
    });

    history.push({
      timestamp: tickTime,
      cpuUsage: Math.round(newCpu),
      memoryUsage: Math.round(newMem),
      networkTraffic: parseFloat(newNet.toFixed(2)),
      activeAlerts: activeOrgIncidents.length,
      slaPercentage: parseFloat(slaPercentage.toFixed(3)),
      dbLoad: Math.round(newDb),
      anomalyScore: Math.round(anomalyScore),
      anomalies
    });

    // Truncate past history size to keep low memory footprint
    if (history.length > 50) {
      history.shift();
    }

    // Occasional simulated background alerts (randomly injected on telemetry feed)
    if (Math.random() < 0.12) {
      const liveSystems = tenant.systems;
      const systemsChoice = liveSystems[Math.floor(Math.random() * liveSystems.length)];
      const warnTypes = [
        { msg: "Secondary edge gateway CPU utilization drifted slightly above baseline tolerances.", sev: "LOW", score: 14 },
        { msg: "Host telemetry buffers neared maximum capacities during background synchronization sweeps.", sev: "MEDIUM", score: 45 },
        { msg: "Slight impedance fluctuations observed on backup grounding paths.", sev: "LOW", score: 9 }
      ];
      const warnObj = warnTypes[Math.floor(Math.random() * warnTypes.length)];

      simulationFeed.unshift({
        id: `feed-auto-${Date.now()}`,
        timestamp: tickTime,
        organizationId: tenant.id,
        source: systemsChoice,
        message: warnObj.msg,
        severity: warnObj.sev as SeverityType,
        anomalyScore: warnObj.score
      });

      // Clamp simulation feed size
      if (simulationFeed.length > 40) {
        simulationFeed.pop();
      }
    }
  });
}, 10000);

// -------------------------------------------------------------
// CORE REST ENDPOINTS
// -------------------------------------------------------------

// 1. Get tenants list
app.get("/api/tenants", (req, res) => {
  res.json(tenants);
});

// 2. Get active organization metrics
app.get("/api/metrics", (req, res) => {
  const orgId = (req.query.orgId as string) || "org-aether";
  const limit = parseInt(req.query.limit as string) || 20;
  const history = metricHistoryMap[orgId] || [];
  res.json(history.slice(-limit));
});

// 3. List incidents matching orgId
app.get("/api/incidents", (req, res) => {
  const orgId = req.query.orgId as string;
  if (!orgId) {
    return res.json(incidents);
  }
  const filtered = incidents.filter(i => i.organizationId === orgId);
  res.json(filtered);
});

// 4. Create manual incident (triggers manual diagnosis options or AI autopilot summaries)
app.post("/api/incidents", async (req, res) => {
  try {
    const { title, description, severity, category, organizationId, assignee } = req.body;
    
    if (!title || !description || !organizationId) {
      return res.status(400).json({ error: "Title, description, and organizationId are required." });
    }

    const newId = `inc-${Math.floor(Math.random() * 900) + 100}`;
    const targetTenant = tenants.find(t => t.id === organizationId);
    
    let simulatedSummary = `Standard operational workflow ticket for resolving the identified defect in ${category || "General Systems"}.`;
    let simulatedActions = [
      "Consult regional SOP guideline literature",
      "Deploy localized visual inspection sensors to isolation parameters"
    ];

    // Call Gemini to generate deep, target operational insights if key is enabled
    if (apiEnabled && ai) {
      try {
        const prompt = `You are an elite operational systems architect on automated incident dispatch duty. 
        We have experienced an operational hardware/software failure.
        Incident Title: ${title}
        Company Target Sector: ${targetTenant?.sector || "Autonomous Engineering"}
        Systems Context: ${targetTenant?.systems.join(", ") || "General Stack"}
        Full Description: ${description}

        Generate an optimized technical response summary (strictly under 60 words) and a list of 3 high-impact, highly technical, actionable immediate mitigation steps.
        Format your response as a valid JSON object matching this schema exactly:
        JSON Object:
        {
          "summary": "AI summary text...",
          "actions": ["Mitigation step 1", "Mitigation step 2", "Mitigation step 3"]
        }
        Return ONLY valid JSON. Absolutely no formatting headers or leading codeblocks outside of raw JSON.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        if (response.text) {
          const cleanJson = response.text.trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed.summary) simulatedSummary = parsed.summary;
          if (parsed.actions && Array.isArray(parsed.actions)) simulatedActions = parsed.actions;
        }
      } catch (gemError) {
        console.error("Gemini failed during incident creation AI parsing. Falling back to local template:", gemError);
      }
    }

    const newIncident: Incident = {
      id: newId,
      title,
      description,
      severity: severity || "MEDIUM",
      status: "OPEN",
      category: category || "Telemetry Grid",
      organizationId,
      assignee: assignee || "System Auto-Assignee",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [
        {
          time: new Date().toISOString(),
          event: `Incident initialized and triaged on category [${category || "Telemetry Grid"}].`,
          author: "System Dispatcher"
        }
      ],
      aiSummary: simulatedSummary,
      aiActions: simulatedActions
    };

    incidents.unshift(newIncident);
    
    // Add warning alert to live log ticker
    simulationFeed.unshift({
      id: `feed-manual-${Date.now()}`,
      timestamp: new Date().toISOString(),
      organizationId,
      source: category || "User Injected Trigger",
      message: `CRITICAL FLAG: ${title} explicitly entered into operational logs.`,
      severity: severity || "MEDIUM",
      anomalyScore: severity === "CRITICAL" ? 95 : severity === "HIGH" ? 75 : 45
    });

    res.status(201).json(newIncident);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create incident." });
  }
});

// 5. Update Incident properties (add custom operational logs, checklist tasks, or changes)
app.post("/api/incidents/:id/update", (req, res) => {
  const { id } = req.params;
  const { status, assignee, timelineEvent, author } = req.body;

  const incIndex = incidents.findIndex(i => i.id === id);
  if (incIndex === -1) {
    return res.status(404).json({ error: "Incident not found." });
  }

  const inc = incidents[incIndex];
  if (status) inc.status = status as StatusType;
  if (assignee) inc.assignee = assignee;
  
  if (timelineEvent) {
    inc.timeline.unshift({
      time: new Date().toISOString(),
      event: timelineEvent,
      author: author || "Operator Console"
    });
  }

  inc.updatedAt = new Date().toISOString();
  res.json(inc);
});

// 6. Deep AI Diagnostic recommendation report generator (explicitly call Gemini on demand)
app.post("/api/incidents/:id/ai-diagnose", async (req, res) => {
  const { id } = req.params;
  const inc = incidents.find(i => i.id === id);
  if (!inc) {
    return res.status(404).json({ error: "Incident not found." });
  }

  try {
    let diagnosisResult = `Summary
Active telemetry patterns suggest transient performance variance on edge-router and gateway-node segments.

Observed Signals
- Minor signal quality alerts logged during peak workloads
- Correlated temperature warnings on nearby enclosure sensors

Potential Cause
Available telemetry indicates localized thermal drifts may be contributing to transient latency anomalies.

Operational Impact
- Risk of transient queue backlog on ingestion cluster pipelines
- Potential short-term recovery overhead on edge-gateway routes

Recommended Actions
- Inspect cooling conditions on active edge gateway enclosures
- Temporarily shift peak workloads to secondary api-gateway paths

Risk Level
Medium

Confidence
Moderate (based on correlated telemetry logs and SOP alignment guidance)`;
    
    if (apiEnabled && ai) {
      const prompt = `You are an expert SRE Diagnostic Copilot and Enterprise Observability Analyst.
      We have experienced an operational incident requiring root-cause alignment:
      Incident: "${inc.title}" (Severity: ${inc.severity})
      Detailed Description: "${inc.description}"
      Timeline Audit logs: ${JSON.stringify(inc.timeline)}
      
      Generate a professional, highly grounded SRE Diagnostic Assessment.
      
      CRITICAL INSTRUCTION ON EPISTEMIC HUMILITY and OBSERVED UNCERTAINTY:
      - ONLY make claims strongly supported by the telemetry, logs, and incident metadata. Do NOT invent physical or mechanical certainty.
      - NEVER say things like "confirmed root cause", "has caused", "is forcing", "is driving", or "physical misalignment occurred" unless explicitly verified in the logs.
      - Explicitly distinguish verified facts from inferences.
      - Use calibrated, conservative SRE vocabulary: "may be contributing to", "appears correlated with", "likely associated with", "potential instability detected", "evidence suggests", "possible alignment drift".
      - Keep responses observability-focused, realistic, and low-hallucination. No cinematic or dramatic storytelling.
      
      Your response MUST strictly use the following 7-heading structure and NO other titles, greetings, or sign-offs:
      
      Summary
      [1 concise sentence summarizing the incident]
      
      Observed Signals
      [Maximum 3 bullet points using ONLY evidence-backed observations from the incident description or timeline]
      
      Potential Cause
      [Carefully worded inference communicating uncertainty clearly using calibrated, conservative SRE vocabulary]
      
      Operational Impact
      - [Grounded operational or business SLA impact 1]
      - [Grounded operational or business SLA impact 2]
      
      Recommended Actions
      - [Grounded mitigation or verification action 1]
      - [Grounded mitigation or verification action 2]
      
      Risk Level
      [Low / Medium / High / Critical]
      
      Confidence
      [Low / Moderate / High, followed by a brief 1-sentence justification]`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      if (response.text) {
        diagnosisResult = response.text;
      }
    } else {
      // Return a beautiful semantic diagnostic runbook template if key is disabled
      diagnosisResult = `Summary
An environmental transient appeared associated with minor performance variance on active cluster paths.

Observed Signals
- Mild temperature metrics drift on gateway enclosure sensors
- Localized packet retransmission count peaks during workload bursts

Potential Cause
Telemetry signals suggest possible thermal drift or slower valve actuation under sustained high-load conditions.

Operational Impact
- Potential localized backpressure on containment lines
- Risk of transient packet retransmission during high workloads

Recommended Actions
- Monitor enclosure cooling metrics and verify active damper positions
- Shift data flows to secondary standby paths if retry trends persist

Risk Level
High

Confidence
Moderate (based on correlated thermal alerts and standard SOP patterns)`;
    }

    // Append to timeline
    inc.timeline.unshift({
      time: new Date().toISOString(),
      event: `AI Auto-Diagnostic runbook generated. Technical analysis attached.`,
      author: "ForgeOps Copilot"
    });

    res.json({ diagnosis: diagnosisResult, incident: inc });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to trigger AI Diagnostic." });
  }
});

// 7. Inject Simulated Telemetry Failure or Alert on the feed
app.post("/api/simulation/trigger", (req, res) => {
  const { system, severity, message, organizationId } = req.body;
  if (!organizationId) {
    return res.status(400).json({ error: "organizationId is mandated to align the simulation feed." });
  }

  const newAlert = {
    id: `feed-triggered-${Date.now()}`,
    timestamp: new Date().toISOString(),
    organizationId,
    source: system || "System Auto Sensor",
    message: message || "Synthetic system anomaly spike induced on thermal coolant array.",
    severity: (severity as SeverityType) || "MEDIUM",
    anomalyScore: severity === "CRITICAL" ? 95 : severity === "HIGH" ? 78 : severity === "MEDIUM" ? 48 : 15
  };

  simulationFeed.unshift(newAlert);
  
  if (simulationFeed.length > 50) {
    simulationFeed.pop();
  }

  res.status(201).json(newAlert);
});

// 8. Get alerts simulation feed
app.get("/api/simulation/timeline", (req, res) => {
  const orgId = req.query.orgId as string;
  if (orgId) {
    const filtered = simulationFeed.filter(f => f.organizationId === orgId);
    return res.json(filtered);
  }
  res.json(simulationFeed);
});

// -------------------------------------------------------------
// SECURE RAG KNOWLEDGE BASE GATEWAYS
// -------------------------------------------------------------

// List knowledge Docs
app.get("/api/knowledge", (req, res) => {
  res.json(knowledgeDocs);
});

// Upload and Chunk SOP Document (Executes semantic vector indexing)
app.post("/api/knowledge/upload", async (req, res) => {
  try {
    const { title, fileName, fileType, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Document Title and text Content details are required." });
    }

    const docId = `doc-${Math.floor(Math.random() * 900) + 100}`;
    const cleanContent = content.trim();
    
    // Naive local chunking on sentence boundaries (approx 250-300 characters each)
    const rawChunks = cleanContent.match(/[^.!?]+[.!?]+(\s+|$)/g) || [cleanContent];
    const groupedChunks: string[] = [];
    let currentChunk = "";

    rawChunks.forEach((chunk: string) => {
      if ((currentChunk + chunk).length > 350) {
        groupedChunks.push(currentChunk.trim());
        currentChunk = chunk;
      } else {
        currentChunk += " " + chunk;
      }
    });
    if (currentChunk.trim()) {
      groupedChunks.push(currentChunk.trim());
    }

    const createdChunks: DocumentChunk[] = [];

    // Form embeddings for each chunk
    for (let cIdx = 0; cIdx < groupedChunks.length; cIdx++) {
      const chunkText = groupedChunks[cIdx];
      const chunkId = `chunk-${docId}-${cIdx}`;
      let embeddingValues: number[] | undefined;

      if (apiEnabled && ai) {
        try {
          const embResponse = await ai.models.embedContent({
            model: "gemini-embedding-2-preview",
            contents: chunkText,
          });
          const anyResponse = embResponse as any;
          if (anyResponse.embedding && anyResponse.embedding.values) {
            embeddingValues = anyResponse.embedding.values;
          }
        } catch (embErr) {
          console.warn("Could not generate Gemini embedding, using lexical fallback vector", embErr);
        }
      }

      // If Gemini Embeddings failed or key is missing, fall back to vocabulary lexical vector
      if (!embeddingValues) {
        embeddingValues = generateTermVector(chunkText);
      }

      const chunkObj: DocumentChunk = {
        id: chunkId,
        text: chunkText,
        embedding: embeddingValues
      };

      createdChunks.push(chunkObj);
      knowledgeChunks.push(chunkObj);
    }

    const newDoc: KnowledgeDoc = {
      id: docId,
      title,
      fileName: fileName || `${title.toLowerCase().replace(/\s+/g, "_")}.txt`,
      fileType: fileType || "Manual Operations Report",
      content,
      createdAt: new Date().toISOString(),
      chunkCount: groupedChunks.length,
      size: `${parseFloat((Buffer.byteLength(content, "utf8") / 1024).toFixed(1))} KB`
    };

    knowledgeDocs.unshift(newDoc);
    res.status(201).json(newDoc);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Could not process document SOP upload." });
  }
});

// -------------------------------------------------------------
// CHAT SERVICES & VECTOR SEARCH CO-SCHEDULER (RAG)
// -------------------------------------------------------------

app.post("/api/copilot/chat", async (req, res) => {
  const { messages, organizationId, userRole } = req.body;
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Conversational array history is required." });
  }

  const lastUserMessage = messages[messages.length - 1];
  const queryText = lastUserMessage.content;
  const targetTenant = tenants.find(t => t.id === organizationId) || tenants[0];

  // Step 1: Semantic Vector Retrieval Match
  // Compute query vector
  let queryVector: number[] | undefined;
  if (apiEnabled && ai) {
    try {
       const embRes = await ai.models.embedContent({
         model: "gemini-embedding-2-preview",
         contents: queryText,
       });
       const anyRes = embRes as any;
       if (anyRes.embedding && anyRes.embedding.values) {
         queryVector = anyRes.embedding.values;
       }
    } catch (e) {
      console.warn("Lexical fallback vector calculation for query search triggered.");
    }
  }

  if (!queryVector) {
    queryVector = generateTermVector(queryText);
  }

  // Calculate similarity against all chunks
  const scoredChunks = knowledgeChunks.map(chunk => {
    let similarity = 0;
    if (chunk.embedding && queryVector) {
      similarity = calculateCosineSimilarity(chunk.embedding, queryVector);
    }
    return { chunk, similarity };
  });

  // Sort and pluck top matches (Similarity > 0.1)
  const topMatches = scoredChunks
    .filter(item => item.similarity > 0.08)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  const matchedTexts = topMatches.map(m => m.chunk.text);
  const ragSources = topMatches.map(m => m.chunk.id);

  // Step 2: Grab active incident context
  const activeIncidents = incidents.filter(i => i.organizationId === organizationId && i.status !== "CLOSED");
  const incidentContextSummary = activeIncidents.map(i => {
    return `[Incident ${i.id}] Title: ${i.title}, Severity: ${i.severity}, Status: ${i.status}, Summary: ${i.aiSummary || i.description}`;
  }).join("\n");

  // Grab recent simulation alert notifications
  const recentAlerts = simulationFeed
    .filter(f => f.organizationId === organizationId)
    .slice(0, 4)
    .map(f => `[${f.timestamp.substring(11, 19)}] Source: ${f.source} - ${f.message} (Severity: ${f.severity}, Anomaly Value: ${f.anomalyScore})`)
    .join("\n");

  // Step 3: Run Gemini generative core
  try {
    let assistantText = "";
    
    if (apiEnabled && ai) {
      const prompt = `You are a calm, analytical Senior SRE and Infrastructure Copilot on our Enterprise Operational Intelligence Platform.
      You are supporting an operator with the role "${userRole || "Operations Analyst"}" for our organization: "${targetTenant.name}" in the "${targetTenant.sector}" sector.

      CURRENT ACTIVE TELEMETRY SYSTEM CONTEXT:
      - SLA Target: ${targetTenant.slaTarget}%
      - Primary Asset Nodes: ${targetTenant.systems.join(", ")}

      CRITICAL SYSTEM INCIDENTS (OPEN):
      ${incidentContextSummary || "No active issues flagged in registries currently."}

      RECENT SYS-ALERTS FEED LOGS:
      ${recentAlerts || "Normal operational log sweeps running. All systems nominal."}

      SEMANTIC RETRIEVAL MATCHES (OPERATIONAL PROTOCOLS & SOPs):
      ${matchedTexts.length > 0 ? matchedTexts.join("\n\n") : "No specific manual runbooks fetched index."}

      User Query: "${queryText}"

      Write an intelligent, precise, and analytical response to guide the operator.
      
      EPISTEMIC HUMILITY and OBSERVED UNCERTAINTY MANDATE:
      - ONLY make claims strongly supported by the uploaded documents, active telemetry streams, database records, and active incident/alert logs.
      - NEVER state speculative conclusions or unverified physical mechanisms as absolute facts.
      - Distinguish verified evidence from inference or correlations.
      - Use calibrated, conservative SRE vocabulary: "appears correlated with", "likely associated with", "may be contributing to", "potential thermal instability detected", "evidence suggests", "possible alignment drift".
      - Do NOT invent or make up precise engineering metrics, numeric telemetry values (such as SNR measurements or mrad drifts), calibration metrics, or physical science details that are not directly present in the logs or documents.
      
      Your response MUST strictly use the following 7-heading structure and NO other titles, greetings, or sign-offs:

      Summary
      [1 concise sentence summarizing the current issue or query]

      Observed Signals
      [Maximum 3 bullet points using ONLY evidence-backed observations from the active telemetry, incident context, or RAG matches]

      Potential Cause
      [Carefully worded inference communicating uncertainty clearly and using calibrated SRE vocabulary]

      Operational Impact
      - [Grounded operational or business SLA impact 1]
      - [Grounded operational or business SLA impact 2]

      Recommended Actions
      - [Grounded mitigation or verification action 1]
      - [Grounded mitigation or verification action 2]

      Risk Level
      [Low / Medium / High / Critical]

      Confidence
      [State a qualitative confidence rating with reasons, e.g., "Moderate (based on correlated telemetry alerts and limited local metrics)"]

      Formatting Constraints:
      - Max 6 concise bullet points overall across list sections.
      - Short paragraphs only (max 2 sentences per paragraph).
      - No giant markdown walls or verbose filler.
      - Never use fictional, military, combat, sci-fi, or dramatic terminology. Use clean cloud/observability names like kubernetes clusters, datacenter regions, edge gateways, or coolant-feed-manifolds.`;

      // Build chat prompt sequence
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      if (response.text) {
        assistantText = response.text;
      } else {
        assistantText = "Summary\nOperational transient registered during diagnostic query routing.\n\nObserved Signals\n- Latency peak detected during prompt processing pipelines\n\nPotential Cause\nTelemetry anomalies suggest possible api-gateway backpressure may be contributing to processing delays.\n\nOperational Impact\n- Transient latency in prompt processing pipelines\n\nRecommended Actions\n- Verify workspace connectivity and resubmit query request\n\nRisk Level\nNominal\n\nConfidence\nModerate (based on localized application loopback status)";
      }
    } else {
      // Local fallback chatbot responder with strict SRE 6-heading layout
      const lowerQuery = queryText.toLowerCase();
      let matchedSopText = "";
      if (topMatches.length > 0) {
        matchedSopText = `\n\n**Grounded Reference SOP Match:**\nBased on your organization's loaded runbooks: ${topMatches[0].chunk.text}`;
      }

      if (lowerQuery.includes("optical") || lowerQuery.includes("alignment") || lowerQuery.includes("drift") || lowerQuery.includes("transceiver") || lowerQuery.includes("router") || lowerQuery.includes("laser")) {
        assistantText = `Summary
An optical edge router transit has registered signal anomalies, correlated with local retry peaks.

Observed Signals
- Packet retransmission rate elevated on edge-router and gateway paths
- Enclosure ambient temperature alerts logged on local telemetry sensors

Potential Cause
Available telemetry suggests possible ambient thermal variance may correlate with transient optical quality levels on edge-router paths.

Operational Impact
- Increased retry rates on edge traffic channels
- Potential SLA target exposure on active ingestion pipelines

Recommended Actions
- Reroute active traffic queues to secondary optical backup trunks if packet retry rates persist
- Deploy automated loop calibration sequences to test transceiver focus margins

Risk Level
Medium

Confidence
Moderate (based on correlated temperature alerts and standard SOP patterns)${matchedSopText}`;
      } else if (lowerQuery.includes("pressure") || lowerQuery.includes("loop") || lowerQuery.includes("valve") || lowerQuery.includes("coolant") || lowerQuery.includes("manifold")) {
        assistantText = `Summary
An elevated backpressure transient has been registered on primary coolant-feed-manifold lines.

Observed Signals
- Local pressure variance warning flagged on primary fluid conduits
- Coolant feed manifold relief loop logs indicate slower mechanical actuation times

Potential Cause
Telemetry signals suggest possible delayed mechanical valve actuation on the standby pressure relief loop, likely associated with trace mechanical valve friction under high workloads.

Operational Impact
- Localized pressure accumulated on cooling containment conduits
- Automated safety capacity throttling hazard on associated database clusters

Recommended Actions
- Activate standby manifold pumps to distribute fluid volume
- Deploy standard release command sequences to test valve tolerances

Risk Level
Critical

Confidence
Moderate (based on correlated warning logs and SOP guidance)${matchedSopText}`;
      } else {
        assistantText = `Summary
The SRE Observability Platform is tracking all production systems. No active anomalies are detected.

Observed Signals
- Ingestion SLA metrics tracking within normal bounds (${targetTenant.slaTarget}%)
- Database pool connectivity holds at 100% with zero alert log flags

Potential Cause
All active ingestion channels, edge gateways, and cloud database clusters appear to be operating within nominal specifications.

Operational Impact
- 100% database pool availability across edge-gateway-us-east-1
- SLA metrics currently tracking at standard bounds (${targetTenant.slaTarget}%)

Recommended Actions
- Monitor CPU and memory utilization panels on the active cluster node page
- Review scheduled runbook or security compliance tasks

Risk Level
Nominal

Confidence
High (based on full telemetry synchronization and zero active alarms)${matchedSopText}`;
      }
    }

    const resMessage: CopilotMessage = {
      id: `copilot-msg-${Date.now()}`,
      role: "assistant",
      content: assistantText,
      timestamp: new Date().toISOString(),
      isRagExpanded: topMatches.length > 0,
      ragSources: ragSources
    };

    res.json(resMessage);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to route Copilot request." });
  }
});

// -------------------------------------------------------------
// EXECUTIVE COMPLIANCE & REPORT GENERATOR (API PROXIES)
// -------------------------------------------------------------

app.post("/api/reports/generate", async (req, res) => {
  const { organizationId, timeframe } = req.body;
  if (!organizationId) {
    return res.status(400).json({ error: "organizationId is missing to compile report targets." });
  }

  const targetTenant = tenants.find(t => t.id === organizationId) || tenants[0];
  const history = metricHistoryMap[organizationId] || [];
  const orgIncidents = incidents.filter(i => i.organizationId === organizationId);
  const openIncidents = orgIncidents.filter(i => i.status !== "CLOSED");

  // Get current average metrics
  let avgCpu = 0;
  let maxAnomaly = 0;
  let minSla = 100;
  if (history.length > 0) {
    let sumCpu = 0;
    history.forEach(h => {
      sumCpu += h.cpuUsage;
      if (h.anomalyScore > maxAnomaly) maxAnomaly = h.anomalyScore;
      if (h.slaPercentage < minSla) minSla = h.slaPercentage;
    });
    avgCpu = sumCpu / history.length;
  } else {
    avgCpu = 45;
    maxAnomaly = 25;
    minSla = targetTenant.slaTarget;
  }

  // Compile prompt for report
  let executiveSummary = `Operational analysis of ${targetTenant.name} over the past ${timeframe || "24-Hours"}. Current systems are operating within nominal parameters, reporting a system SLA of ${minSla.toFixed(3)}%, which satisfies standard SLAs. Local calibration and environmental sensors indicate stable operation across all nodes.`;
  let aiRecommendations = [
    "Recalibrate climate damper actuators and thermal sensors within CNC enclosure cabinet.",
    "Schedule physical preventative maintenance checks on critical coolant loop manifold valves during next planned shift down cycle."
  ];

  if (apiEnabled && ai) {
    try {
      const reportPrompt = `You are a calm, analytical Lead Enterprise SRE Auditor and Operations Director.
      Generate a professional executive operational assessment report for the enterprise board:
      Organization: "${targetTenant.name}" (${targetTenant.sector})
      Operations Timeframe: "${timeframe || "24-Hours"}"
      Active Incidents Database: ${JSON.stringify(orgIncidents.map(i => ({ id: i.id, title: i.title, severity: i.severity, status: i.status })))}
      Performance Stats: Average CPU ${avgCpu.toFixed(1)}%, Max Anomaly Index ${maxAnomaly}, Minimum Registered SLA ${minSla.toFixed(3)}%

      Provide an executive board summary, a SLA compliance analysis, and a list of 3 highly technical long-term preventive recommendations.
      Format your response as a valid JSON object matching this schema exactly:
      {
        "executiveSummary": "A formal board-ready operations summary paragraph...",
        "slaPerformance": "An analytical description of SLA containment margins...",
        "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
      }
      Do not include any wrapper tags, backticks or markdown outside of raw parseable JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: reportPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        const cleanReportJson = response.text.trim();
        const parsedReport = JSON.parse(cleanReportJson);
        if (parsedReport.executiveSummary) executiveSummary = parsedReport.executiveSummary;
        if (parsedReport.recommendations && Array.isArray(parsedReport.recommendations)) {
          aiRecommendations = parsedReport.recommendations;
        }
      }
    } catch (e) {
      console.error("Gemini failed during Executive Report generative compilation. Falling back to local template", e);
    }
  }

  const generatedReport: OperationalReport = {
    id: `rep-${Math.floor(Math.random() * 900) + 100}`,
    organizationId,
    generatedAt: new Date().toISOString(),
    title: `ForgeOps Intelligence Briefing - ${targetTenant.name}`,
    timeframe: timeframe || "Past 24 Hours",
    executiveSummary,
    slaPerformance: `Overall grid SLA successfully maintained at ${minSla.toFixed(3)}% which is in alignment with target commitments of ${targetTenant.slaTarget}%. Telemetry anomalies registered a peak value of ${maxAnomaly} index during thermal surge spikes, requiring ongoing surveillance cycles.`,
    riskEvaluation: {
      overallRisk: openIncidents.length > 0 ? (openIncidents.some(i => i.severity === "CRITICAL") ? "CRITICAL" : "HIGH") : "NOMINAL",
      systemsImpactedCount: openIncidents.length,
      description: openIncidents.length > 0 
        ? `SLA margins compromised by active ${openIncidents.map(i => i.title).join(", ")} tracking locks.` 
        : "All system parameters displaying nominal status flags with normal drift characteristics."
    },
    keyIncidentsSummarized: orgIncidents.map(i => ({
      id: i.id,
      title: i.title,
      severity: i.severity,
      resolutionState: i.status === "CLOSED" ? "Resolved successfully" : `Active [${i.status}] with logs`
    })),
    aiRecommendations
  };

  res.json(generatedReport);
});

// -------------------------------------------------------------
// VITE DEV SERVER & PRODUCTION ASSETS ROUTING BOOTSTRAP
// -------------------------------------------------------------

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ForgeOps AI Control Grid deployed on port ${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error("Critical platform bootstrap failure:", err);
});
