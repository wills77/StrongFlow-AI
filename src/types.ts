/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'ai';
  category: string; // e.g. "gmail_trigger", "slack_send", "ai_sentiment"
  title: string;
  description: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  outputData?: any;
  status?: 'pending' | 'running' | 'success' | 'error';
  executionLog?: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  stats: {
    executions: number;
    successRate: number;
    timeSavedMinutes: number;
  };
}

export interface ExecutionLog {
  nodeId: string;
  title: string;
  type: string;
  status: 'success' | 'error' | 'pending';
  log: string;
  output: any;
}

export interface Connector {
  id: string;
  name: string;
  category: 'communication' | 'marketing' | 'finance' | 'productivity';
  status: 'connected' | 'disconnected';
  iconName: string;
  description: string;
  fields: { name: string; label: string; placeholder: string; type: string }[];
}
