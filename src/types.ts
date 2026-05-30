/**
 * ForgeOps AI Shared TypeScript Interfaces and Types
 */

export interface Tenant {
  id: string;
  name: string;
  sector: string;
  slaTarget: number;
  systems: string[];
}

export type SeverityType = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type StatusType = "OPEN" | "TRIAGED" | "INVESTIGATING" | "RESOLVING" | "CLOSED";

export interface IncidentTimelineEvent {
  time: string;
  event: string;
  author: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: SeverityType;
  status: StatusType;
  category: string;
  organizationId: string;
  assignee: string;
  updatedAt: string;
  createdAt: string;
  timeline: IncidentTimelineEvent[];
  aiSummary?: string;
  aiActions?: string[];
}

export interface DocumentChunk {
  id: string;
  text: string;
  embedding?: number[];
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  content: string;
  createdAt: string;
  chunkCount: number;
  size: string;
}

export interface AnomalyIndex {
  system: string;
  score: number;
  details: string;
  severity: SeverityType;
}

export interface MetricSnapshot {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  networkTraffic: number; // in Gbps
  activeAlerts: number;
  slaPercentage: number;
  dbLoad: number;
  anomalyScore: number;
  anomalies: AnomalyIndex[];
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  isRagExpanded?: boolean;
  ragSources?: string[];
}

export interface OperationalReport {
  id: string;
  organizationId: string;
  generatedAt: string;
  title: string;
  timeframe: string;
  executiveSummary: string;
  slaPerformance: string;
  riskEvaluation: {
    overallRisk: "CRITICAL" | "HIGH" | "ELEVATED" | "NOMINAL";
    systemsImpactedCount: number;
    description: string;
  };
  keyIncidentsSummarized: Array<{
    id: string;
    title: string;
    severity: SeverityType;
    resolutionState: string;
  }>;
  aiRecommendations: string[];
}
