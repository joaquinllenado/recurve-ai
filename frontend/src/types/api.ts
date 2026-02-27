export interface Strategy {
  version: number;
  product_description?: string;
  icp: string;
  keywords: string[];
  competitors: string[];
  created_at: string;
}

export interface Lead {
  name: string;
  domain: string;
  tech_stack: string[];
  employees?: number;
  funding?: string;
  score?: number;
}

export interface Lesson {
  lesson_id: string;
  type: string;
  details: string;
  timestamp: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "strategy" | "company" | "evidence" | "lesson";
  version?: number;
  icp?: string;
  keywords?: string[];
  competitors?: string[];
  created_at?: string;
  name?: string;
  domain?: string;
  tech_stack?: string[];
  score?: number;
  source_url?: string;
  summary?: string;
  lesson_id?: string;
  details?: string;
  timestamp?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ActivityEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}
