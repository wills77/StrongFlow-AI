import React, { useState, useEffect, useRef } from "react";
import { 
  Zap, TrendingUp, Clock, Coins, Activity, ArrowRight, Play, CheckCircle2, 
  AlertCircle, RefreshCw, Plus, Trash2, Settings, Layers, Globe, HelpCircle, 
  Send, Database, Inbox, Smile, FileText, Sparkles, Cpu, Eye, Save, Link2, 
  Check, ExternalLink, Lock, ShieldCheck, ChevronRight, CheckSquare
} from "lucide-react";
import { Workflow, WorkflowNode, WorkflowEdge, Connector } from "./types";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "editor" | "connectors">("dashboard");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Connectors State
  const [connectors, setConnectors] = useState<Connector[]>([
    {
      id: "gmail",
      name: "Gmail",
      category: "communication",
      status: "connected",
      iconName: "Inbox",
      description: "Lire les emails entrants et envoyer des brouillons ou réponses formulées par l'IA.",
      fields: [
        { name: "email", label: "Adresse Email", placeholder: "support@entreprise.com", type: "email" },
        { name: "folder", label: "Dossier / Libellé", placeholder: "INBOX", type: "text" }
      ]
    },
    {
      id: "slack",
      name: "Slack",
      category: "communication",
      status: "connected",
      iconName: "Send",
      description: "Notifier votre équipe, poster des résumés d'IA ou des alertes d'urgence dans vos canaux.",
      fields: [
        { name: "webhookUrl", label: "Slack Webhook URL", placeholder: "https://hooks.slack.com/services/...", type: "password" },
        { name: "defaultChannel", label: "Canal par défaut", placeholder: "#support-prioritaire", type: "text" }
      ]
    },
    {
      id: "hubspot",
      name: "HubSpot",
      category: "productivity",
      status: "connected",
      iconName: "Database",
      description: "Synchroniser les leads qualifiés, notes d'analyse d'agent et fiches de prospection.",
      fields: [
        { name: "apiKey", label: "Clé d'API HubSpot", placeholder: "pat-eu1-...", type: "password" }
      ]
    },
    {
      id: "telegram",
      name: "Telegram",
      category: "communication",
      status: "disconnected",
      iconName: "Send",
      description: "Envoi instantané d'alertes push critiques à l'équipe commerciale ou de support.",
      fields: [
        { name: "botToken", label: "Bot Token Telegram", placeholder: "123456:ABC-def...", type: "password" },
        { name: "chatId", label: "ID du Canal / Chat", placeholder: "commerciaux_strongflow", type: "text" }
      ]
    },
    {
      id: "stripe",
      name: "Stripe",
      category: "finance",
      status: "connected",
      iconName: "Coins",
      description: "Générer automatiquement des factures brouillons ou abonnements à partir de l'IA.",
      fields: [
        { name: "secretKey", label: "Stripe Secret Key", placeholder: "sk_test_...", type: "password" }
      ]
    },
    {
      id: "shopify",
      name: "Shopify",
      category: "productivity",
      status: "disconnected",
      iconName: "Globe",
      description: "Écouter les nouveaux produits et mettre à jour automatiquement les fiches avec du SEO IA.",
      fields: [
        { name: "storeUrl", label: "URL de la Boutique", placeholder: "ma-boutique.myshopify.com", type: "text" },
        { name: "accessToken", label: "Access Token", placeholder: "shpat_...", type: "password" }
      ]
    },
    {
      id: "google_sheets",
      name: "Google Sheets",
      category: "productivity",
      status: "connected",
      iconName: "Database",
      description: "Ajouter des lignes, lire des listes de prospects ou enrichir des fichiers Excel.",
      fields: [
        { name: "spreadsheetId", label: "ID Google Sheet", placeholder: "1A2B3C4D5E...", type: "text" }
      ]
    }
  ]);

  const [activeConnector, setActiveConnector] = useState<Connector | null>(null);
  const [connectorFormValues, setConnectorFormValues] = useState<Record<string, string>>({});

  // Workflow Running / Simulation States
  const [isRunning, setIsRunning] = useState(false);
  const [runLogs, setRunLogs] = useState<any[]>([]);
  const [runSuccess, setRunSuccess] = useState<boolean | null>(null);
  const [usesRealGemini, setUsesRealGemini] = useState<boolean>(false);
  const [customTriggerInput, setCustomTriggerInput] = useState<string>("");

  // Draggable Node canvas reference & state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load workflows on mount
  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
        if (data.length > 0) {
          // Default selection
          setActiveWorkflow(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load workflows", err);
    }
  };

  // Save changes to backend
  const saveWorkflowToBackend = async (wf: Workflow) => {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wf),
      });
      if (res.ok) {
        const updated = await res.json();
        // Update local list
        setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w));
        return updated;
      }
    } catch (err) {
      console.error("Failed to save workflow", err);
    }
    return wf;
  };

  // Run whole workflow
  const triggerWorkflowRun = async (wf: Workflow, customInputText?: string) => {
    setIsRunning(true);
    setRunLogs([]);
    setRunSuccess(null);
    
    // Clear statuses in nodes
    const resetNodes = wf.nodes.map(n => ({ ...n, status: 'pending' as const, executionLog: undefined, outputData: null }));
    const resetWf = { ...wf, nodes: resetNodes };
    setActiveWorkflow(resetWf);

    // Prepare custom trigger input if provided or parsed
    let triggerInput = null;
    if (customInputText) {
      try {
        triggerInput = JSON.parse(customInputText);
      } catch {
        // Fallback if not valid JSON, treat as a body or content string
        const triggerNode = wf.nodes.find(n => n.type === "trigger");
        if (triggerNode && triggerNode.outputData) {
          triggerInput = { ...triggerNode.outputData, body: customInputText, specs: customInputText };
        }
      }
    }

    try {
      const response = await fetch("/api/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: resetWf, triggerInput })
      });

      if (response.ok) {
        const result = await response.json();
        setRunLogs(result.logs || []);
        setUsesRealGemini(result.usesRealGemini);
        setRunSuccess(true);

        // Update workflow with success and values
        const finalNodes = resetNodes.map(node => {
          const matchedLog = result.logs.find((l: any) => l.nodeId === node.id);
          if (matchedLog) {
            return {
              ...node,
              status: matchedLog.status,
              outputData: matchedLog.output,
              executionLog: matchedLog.log
            };
          }
          return node;
        });

        const updatedWf = { 
          ...wf, 
          nodes: finalNodes,
          stats: {
            ...wf.stats,
            executions: (wf.stats?.executions || 0) + 1
          }
        };
        setActiveWorkflow(updatedWf);
        saveWorkflowToBackend(updatedWf);
      } else {
        setRunSuccess(false);
      }
    } catch (err) {
      console.error("Error executing workflow", err);
      setRunSuccess(false);
    } finally {
      setIsRunning(false);
    }
  };

  // Canvas Drag Handling
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    if (!activeWorkflow) return;
    const node = activeWorkflow.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDraggedNodeId(nodeId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId || !activeWorkflow || !canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Calculate new position relative to canvas container
    let x = e.clientX - canvasRect.left - dragOffset.x;
    let y = e.clientY - canvasRect.top - dragOffset.y;

    // Grid snapping (snap to 10px grid)
    x = Math.round(x / 10) * 10;
    y = Math.round(y / 10) * 10;

    // Boundaries
    x = Math.max(10, Math.min(x, canvasRect.width - 240));
    y = Math.max(10, Math.min(y, canvasRect.height - 180));

    // Update state
    const updatedNodes = activeWorkflow.nodes.map(n => 
      n.id === draggedNodeId ? { ...n, position: { x, y } } : n
    );

    setActiveWorkflow({
      ...activeWorkflow,
      nodes: updatedNodes
    });
  };

  const handleCanvasMouseUp = () => {
    if (draggedNodeId && activeWorkflow) {
      saveWorkflowToBackend(activeWorkflow);
    }
    setDraggedNodeId(null);
  };

  // Add Node trigger
  const addNewNode = (category: string, type: 'trigger' | 'condition' | 'action' | 'ai') => {
    if (!activeWorkflow) return;

    // Generate neat unique ID
    const newId = `${category}-${Math.floor(Math.random() * 1000)}`;
    
    let title = "Nouveau Node";
    let description = "Description du node";
    let config: Record<string, any> = {};
    let outputData: any = {};

    // Configure preset values
    if (category === "gmail_trigger") {
      title = "Email Support Client";
      description = "Déclenché par les emails d'assistance";
      config = { emailFilter: "support" };
      outputData = { sender: "client@exemple.fr", subject: "Compte bloqué", body: "Je suis bloqué sur le dashboard." };
    } else if (category === "ai_sentiment") {
      title = "Analyse de Sentiment";
      description = "Évalue la frustration de l'utilisateur";
      config = { sourceText: "{{trigger-1.body}}" };
    } else if (category === "ai_classify") {
      title = "Classification de Demande";
      description = "Trie par catégorie d'urgence";
      config = { sourceText: "{{trigger-1.body}}", categories: ["Technique", "Facturation", "Commercial"] };
    } else if (category === "ai_reply") {
      title = "Brouillon Intelligent IA";
      description = "Rédige une réponse fluide personnalisée";
      config = { prompt: "Répondre avec empathie", context: "{{trigger-1.body}}" };
    } else if (category === "ai_agent") {
      title = "Mission d'Agent IA";
      description = "Agent autonome intelligent";
      config = { goal: "Qualifier le lead en profondeur", context: "{{trigger-1.company}}" };
    } else if (category === "slack_send") {
      title = "Alerte Slack";
      description = "Envoie une notification Slack";
      config = { channel: "support-alertes", message: "Nouveau message !" };
    } else if (category === "hubspot_contact") {
      title = "Créer Contact HubSpot";
      description = "Enregistre dans HubSpot CRM";
      config = { fullName: "Nom Prospect", company: "Nom Entreprise" };
    } else if (category === "gmail_send") {
      title = "Envoyer Email Gmail";
      description = "Envoi direct via mail serveur";
      config = { to: "{{trigger-1.sender}}", subject: "Réponse IA", body: "Contenu" };
    } else if (category === "telegram_send") {
      title = "Alerte Telegram";
      description = "Notification instantanée Push";
      config = { chatId: "strongflow_alertes", message: "Message urgent !" };
    } else if (category === "stripe_invoice") {
      title = "Facture Stripe";
      description = "Génère un brouillon de facture";
      config = { customer: "Client", amount: 49.0 };
    }

    const newNode: WorkflowNode = {
      id: newId,
      type,
      category,
      title,
      description,
      position: { x: 150 + (activeWorkflow.nodes.length * 40) % 300, y: 150 + (activeWorkflow.nodes.length * 30) % 200 },
      config,
      outputData: type === 'trigger' ? outputData : null,
      status: "pending"
    };

    const updatedNodes = [...activeWorkflow.nodes, newNode];
    
    // Auto-create edge from previous selected node if possible
    const updatedEdges = [...activeWorkflow.edges];
    if (activeWorkflow.nodes.length > 0) {
      const lastNode = activeWorkflow.nodes[activeWorkflow.nodes.length - 1];
      updatedEdges.push({
        id: `e-${lastNode.id}-${newId}`,
        source: lastNode.id,
        target: newId
      });
    }

    const updatedWf = {
      ...activeWorkflow,
      nodes: updatedNodes,
      edges: updatedEdges
    };

    setActiveWorkflow(updatedWf);
    setSelectedNodeId(newId);
    saveWorkflowToBackend(updatedWf);
  };

  // Delete node
  const deleteNode = (nodeId: string) => {
    if (!activeWorkflow) return;
    const updatedNodes = activeWorkflow.nodes.filter(n => n.id !== nodeId);
    const updatedEdges = activeWorkflow.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    
    const updatedWf = {
      ...activeWorkflow,
      nodes: updatedNodes,
      edges: updatedEdges
    };
    setActiveWorkflow(updatedWf);
    setSelectedNodeId(null);
    saveWorkflowToBackend(updatedWf);
  };

  // Update specific node config
  const updateNodeConfig = (nodeId: string, key: string, value: any) => {
    if (!activeWorkflow) return;
    const updatedNodes = activeWorkflow.nodes.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          config: {
            ...n.config,
            [key]: value
          }
        };
      }
      return n;
    });

    const updatedWf = {
      ...activeWorkflow,
      nodes: updatedNodes
    };
    setActiveWorkflow(updatedWf);
    saveWorkflowToBackend(updatedWf);
  };

  // Update node details (Title, Desc)
  const updateNodeDetails = (nodeId: string, title: string, description: string) => {
    if (!activeWorkflow) return;
    const updatedNodes = activeWorkflow.nodes.map(n => {
      if (n.id === nodeId) {
        return { ...n, title, description };
      }
      return n;
    });

    const updatedWf = {
      ...activeWorkflow,
      nodes: updatedNodes
    };
    setActiveWorkflow(updatedWf);
    saveWorkflowToBackend(updatedWf);
  };

  // Create new blank workflow
  const createNewWorkflow = () => {
    const newWf: Workflow = {
      id: "wf-" + Math.random().toString(36).substring(2, 9),
      name: "Nouveau flux intelligent",
      description: "Automatisation de processus personnalisée sans code propulsée par Gemini.",
      active: true,
      nodes: [
        {
          id: "trigger-new",
          type: "trigger",
          category: "gmail_trigger",
          title: "Nouvel Email Reçu",
          description: "Déclenché par votre messagerie",
          position: { x: 80, y: 150 },
          config: { emailFilter: "support" },
          outputData: { sender: "client@exemple.fr", subject: "Aide", body: "Besoin de votre support de toute urgence." }
        },
        {
          id: "ai-new",
          type: "ai",
          category: "ai_sentiment",
          title: "Analyse IA de Sentiment",
          description: "Détecte le sentiment général",
          position: { x: 380, y: 150 },
          config: { sourceText: "{{trigger-new.body}}" }
        }
      ],
      edges: [
        { id: "e-new-1", source: "trigger-new", target: "ai-new" }
      ],
      stats: {
        executions: 0,
        successRate: 100,
        timeSavedMinutes: 8
      }
    };

    setWorkflows(prev => [...prev, newWf]);
    setActiveWorkflow(newWf);
    saveWorkflowToBackend(newWf);
    setActiveTab("editor");
  };

  // Delete whole workflow
  const deleteWorkflow = async (id: string) => {
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      if (res.ok) {
        const updated = workflows.filter(w => w.id !== id);
        setWorkflows(updated);
        if (updated.length > 0) {
          setActiveWorkflow(updated[0]);
        } else {
          setActiveWorkflow(null);
        }
      }
    } catch (err) {
      console.error("Could not delete workflow", err);
    }
  };

  // Handle active selected node for inspector
  const selectedNode = activeWorkflow?.nodes.find(n => n.id === selectedNodeId);

  // Connection SVG builder
  const drawEdgeCurves = () => {
    if (!activeWorkflow) return null;
    return activeWorkflow.edges.map(edge => {
      const sourceNode = activeWorkflow.nodes.find(n => n.id === edge.source);
      const targetNode = activeWorkflow.nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return null;

      // Define approximate coordinate centers of the nodes
      // Each card is roughly 240px wide and 120px tall
      const x1 = sourceNode.position.x + 240;
      const y1 = sourceNode.position.y + 60;
      const x2 = targetNode.position.x;
      const y2 = targetNode.position.y + 60;

      // Cubic bezier curve coordinates
      const controlDist = Math.max(100, Math.abs(x2 - x1) * 0.5);
      const pathData = `M ${x1} ${y1} C ${x1 + controlDist} ${y1}, ${x2 - controlDist} ${y2}, ${x2} ${y2}`;

      return (
        <g key={edge.id}>
          <path
            d={pathData}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="3"
            strokeOpacity="0.4"
            className="transition-all duration-300"
          />
          <path
            d={pathData}
            fill="none"
            stroke="#818cf8"
            strokeWidth="2.5"
            strokeDasharray="8 6"
            className="animate-[dash_20s_linear_infinite]"
            strokeOpacity="0.8"
          />
          <circle cx={x1} cy={y1} r="4" fill="#818cf8" />
          <circle cx={x2} cy={y2} r="4" fill="#818cf8" />
        </g>
      );
    });
  };

  // Handle Connector Connection
  const handleConnectConnector = (c: Connector) => {
    setActiveConnector(c);
    // Prefill fields
    const initialFields: Record<string, string> = {};
    c.fields.forEach(f => {
      initialFields[f.name] = "";
    });
    setConnectorFormValues(initialFields);
  };

  const handleSaveConnector = () => {
    if (!activeConnector) return;
    setConnectors(prev => prev.map(c => {
      if (c.id === activeConnector.id) {
        return { ...c, status: "connected" as const };
      }
      return c;
    }));
    setActiveConnector(null);
  };

  const handleDisconnectConnector = (id: string) => {
    setConnectors(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status: "disconnected" as const };
      }
      return c;
    }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#09090B] text-zinc-300 font-sans antialiased overflow-x-hidden selection:bg-purple-500/30 selection:text-white">
      
      {/* Dynamic Style injection for dash animations */}
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
        .animate-dash {
          animation: dash 30s linear infinite;
        }
        .grid-bg {
          background-image: 
            linear-gradient(to right, #1f1f2e 1px, transparent 1px),
            linear-gradient(to bottom, #1f1f2e 1px, transparent 1px);
          background-size: 30px 30px;
        }
      `}</style>

      {/* Modern Navigation Header */}
      <nav className="flex items-center justify-between px-6 py-4 bg-[#09090B] border-b border-zinc-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
        <div className="flex items-center gap-10">
          
          {/* Logo with futuristic gradients */}
          <div className="flex items-center gap-3 select-none">
            <div className="relative w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
              <div className="w-4 h-4 bg-white/20 rounded-full blur-sm"></div>
              <div className="absolute w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white leading-none">
                StrongFlow<span className="text-indigo-400">AI</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-1">Enterprise Automation</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {[
              { id: "dashboard", label: "Tableau de Bord", icon: Activity },
              { id: "editor", label: "Éditeur de Flux", icon: Layers },
              { id: "connectors", label: "Connecteurs & API", icon: Globe }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? "bg-zinc-900 text-white shadow-sm border border-zinc-800" 
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-indigo-400" : ""}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Quick-actions & Status */}
        <div className="flex items-center gap-4">
          
          {/* System status tag */}
          <div className="hidden sm:flex items-center bg-zinc-900/80 px-3.5 py-1.5 rounded-full border border-zinc-800 shadow-inner">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mr-3">Moteur d'IA</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-emerald-400 text-xs font-semibold">Gemini Opérationnel</span>
            </div>
          </div>

          <button 
            onClick={createNewWorkflow}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.25)] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau Workflow</span>
            <span className="sm:hidden">Créer</span>
          </button>

          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white" title="Compte démo entreprise">
            SF
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 flex flex-col">
        
        {/* VIEW 1: DASHBOARD VIEW */}
        {activeTab === "dashboard" && (
          <div className="max-w-7xl mx-auto w-full px-6 py-8">
            <Dashboard 
              workflows={workflows}
              onSelectWorkflow={(wf) => {
                setActiveWorkflow(wf);
                setActiveTab("editor");
              }}
              onTriggerQuickRun={(wf) => {
                setActiveWorkflow(wf);
                setActiveTab("editor");
                triggerWorkflowRun(wf);
              }}
            />
          </div>
        )}

        {/* VIEW 2: WORKFLOW EDITOR CANVAS AND INSPECTOR */}
        {activeTab === "editor" && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-80px)]">
            
            {/* Catalog & Flow Selector Sidebar */}
            <aside className="w-full lg:w-72 border-r border-zinc-800 bg-[#0C0C0E] flex flex-col shrink-0">
              
              {/* Active flow selection */}
              <div className="p-4 border-b border-zinc-800 bg-[#09090B]">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Flux de travail actif</label>
                <div className="relative">
                  <select
                    value={activeWorkflow?.id || ""}
                    onChange={(e) => {
                      const found = workflows.find(w => w.id === e.target.value);
                      if (found) {
                        setActiveWorkflow(found);
                        setSelectedNodeId(null);
                      }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {workflows.map(wf => (
                      <option key={wf.id} value={wf.id}>{wf.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toolbox and Node Library */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 mb-3">Déclencheurs (Triggers)</div>
                  <div className="space-y-2">
                    <button 
                      onClick={() => addNewNode("gmail_trigger", "trigger")}
                      className="w-full text-left p-3 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl border border-zinc-800/80 hover:border-indigo-500/40 flex items-center gap-3 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center font-bold text-xs">
                        G
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">Email Client Reçu</div>
                        <div className="text-[10px] text-zinc-500 truncate">Gmail Inbox Trigger</div>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400" />
                    </button>

                    <button 
                      onClick={() => addNewNode("shopify_product", "trigger")}
                      className="w-full text-left p-3 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl border border-zinc-800/80 hover:border-indigo-500/40 flex items-center gap-3 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center font-bold text-xs">
                        S
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">Nouveau Produit Shopify</div>
                        <div className="text-[10px] text-zinc-500 truncate">Shopify E-Commerce Trigger</div>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400" />
                    </button>

                    <button 
                      onClick={() => addNewNode("sheets_trigger", "trigger")}
                      className="w-full text-left p-3 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl border border-zinc-800/80 hover:border-indigo-500/40 flex items-center gap-3 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 bg-emerald-600/10 text-emerald-500 rounded-lg flex items-center justify-center font-bold text-xs">
                        田
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">Formulaire de Lead Sheet</div>
                        <div className="text-[10px] text-zinc-500 truncate">Google Sheets Row Trigger</div>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest px-1 mb-3 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    Intelligence IA Native
                  </div>
                  <div className="space-y-2">
                    {[
                      { cat: "ai_sentiment", label: "Analyse du Sentiment", desc: "Positif, Neutre, Négatif", icon: Smile, color: "text-purple-400" },
                      { cat: "ai_classify", label: "Classification de Texte", desc: "Routage thématique intelligent", icon: Layers, color: "text-indigo-400" },
                      { cat: "ai_reply", label: "Rdaction Assistée", desc: "Brouillons personnalisés fluides", icon: FileText, color: "text-emerald-400" },
                      { cat: "ai_summarize", label: "Résumé de Documents", desc: "Idéal pour fiches produits SEO", icon: FileText, color: "text-amber-400" },
                      { cat: "ai_extract", label: "Extraction Structurée", desc: "Transforme le texte brut en JSON", icon: Database, color: "text-sky-400" },
                      { cat: "ai_agent", label: "Agent IA Autonome", desc: "Plan de qualification complet", icon: Cpu, color: "text-pink-400" },
                    ].map(node => {
                      const Icon = node.icon;
                      return (
                        <button 
                          key={node.cat}
                          onClick={() => addNewNode(node.cat, "ai")}
                          className="w-full text-left p-3 bg-indigo-950/20 hover:bg-indigo-950/40 rounded-xl border border-indigo-900/30 hover:border-indigo-500/50 flex items-center gap-3 transition-all cursor-pointer group"
                        >
                          <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                            <Icon className={`h-4 w-4 ${node.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-indigo-200 group-hover:text-white flex items-center gap-1">
                              {node.label}
                            </div>
                            <div className="text-[10px] text-indigo-300/60 truncate">{node.desc}</div>
                          </div>
                          <Plus className="h-3.5 w-3.5 text-indigo-400/40 group-hover:text-indigo-300" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 mb-3">Intégrations & Actions</div>
                  <div className="space-y-2">
                    <button 
                      onClick={() => addNewNode("slack_send", "action")}
                      className="w-full text-left p-3 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl border border-zinc-800/80 hover:border-indigo-500/40 flex items-center gap-3 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center text-xs">
                        Slack
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">Notifier Slack Channel</div>
                        <div className="text-[10px] text-zinc-500 truncate">Envoi d'alertes instantanées</div>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400" />
                    </button>

                    <button 
                      onClick={() => addNewNode("hubspot_contact", "action")}
                      className="w-full text-left p-3 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl border border-zinc-800/80 hover:border-indigo-500/40 flex items-center gap-3 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center text-xs">
                        Hub
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">Créer Lead HubSpot</div>
                        <div className="text-[10px] text-zinc-500 truncate">Synchroniser l'analyse de l'IA</div>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400" />
                    </button>

                    <button 
                      onClick={() => addNewNode("telegram_send", "action")}
                      className="w-full text-left p-3 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl border border-zinc-800/80 hover:border-indigo-500/40 flex items-center gap-3 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 bg-blue-400/10 text-blue-400 rounded-lg flex items-center justify-center text-xs">
                        TG
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">Alerte Push Telegram</div>
                        <div className="text-[10px] text-zinc-500 truncate">Bot Telegram d'équipe</div>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar Footer stats */}
              {activeWorkflow && (
                <div className="p-4 border-t border-zinc-800 bg-[#0C0C0E]">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 space-y-1">
                    <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Économie Estimée</div>
                    <div className="text-xl font-light text-white tracking-tight">
                      {((activeWorkflow.stats?.executions || 0) * (activeWorkflow.stats?.timeSavedMinutes || 10) * 0.75).toFixed(2)} €
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Basé sur {activeWorkflow.stats?.executions || 0} exécutions réussies
                    </div>
                  </div>
                </div>
              )}
            </aside>

            {/* Canvas Area */}
            <div className="flex-1 flex flex-col bg-[#09090B] relative min-h-0 overflow-hidden">
              
              {/* Canvas Header / Controls */}
              <div className="px-6 py-3 bg-[#0C0C0E] border-b border-zinc-800 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-sm">
                    {activeWorkflow ? activeWorkflow.name : "Sélectionnez un workflow"}
                  </span>
                  {activeWorkflow && (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        value={activeWorkflow.name}
                        onChange={(e) => {
                          const updated = { ...activeWorkflow, name: e.target.value };
                          setActiveWorkflow(updated);
                          setWorkflows(prev => prev.map(w => w.id === activeWorkflow.id ? updated : w));
                        }}
                        onBlur={() => saveWorkflowToBackend(activeWorkflow)}
                        className="bg-transparent border-0 hover:bg-zinc-900 focus:bg-zinc-900 border-zinc-800 rounded-lg px-2 py-0.5 text-xs text-zinc-400 focus:ring-1 focus:ring-indigo-500 max-w-xs transition-colors"
                        title="Renommer le workflow"
                      />
                      <button
                        onClick={() => {
                          if (confirm("Voulez-vous supprimer ce workflow ?")) {
                            deleteWorkflow(activeWorkflow.id);
                          }
                        }}
                        className="text-zinc-600 hover:text-rose-400 p-1.5 rounded transition-colors"
                        title="Supprimer le workflow"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {activeWorkflow && (
                  <div className="flex items-center gap-3">
                    <div className="text-2xs text-zinc-500 hidden md:inline-flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Auto-sauvegarde active
                    </div>
                    
                    <button
                      onClick={() => triggerWorkflowRun(activeWorkflow, customTriggerInput)}
                      disabled={isRunning}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_20px_rgba(79,70,229,0.25)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Exécution...
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          Lancer le Workflow
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Core Workflow Canvas Grid */}
              <div 
                ref={canvasRef}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className="flex-1 relative overflow-auto grid-bg p-8 select-none"
                style={{ minHeight: "350px" }}
              >
                
                {/* SVG Connections Container */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: "1200px", minHeight: "1000px" }}>
                  {drawEdgeCurves()}
                </svg>

                {/* Nodes rendering */}
                {activeWorkflow && activeWorkflow.nodes.map(node => {
                  const isSelected = selectedNodeId === node.id;
                  const getCategoryStyle = () => {
                    if (node.type === "trigger") return "border-blue-500/40 bg-blue-950/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]";
                    if (node.type === "ai") return "border-indigo-500/40 bg-indigo-950/20 shadow-[0_0_25px_rgba(99,102,241,0.15)]";
                    return "border-zinc-800 bg-[#161618] hover:border-zinc-700";
                  };

                  const getStatusIcon = () => {
                    if (node.status === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-400 animate-pulse" />;
                    if (node.status === "running") return <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />;
                    if (node.status === "error") return <AlertCircle className="h-4 w-4 text-rose-400" />;
                    return null;
                  };

                  return (
                    <div
                      key={node.id}
                      style={{ 
                        left: `${node.position.x}px`, 
                        top: `${node.position.y}px`,
                        position: 'absolute'
                      }}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      className={`w-60 p-4 rounded-2xl border-2 transition-shadow cursor-grab active:cursor-grabbing z-10 ${getCategoryStyle()} ${
                        isSelected ? "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.25)]" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          node.type === "trigger" ? "bg-blue-500/20 text-blue-400" :
                          node.type === "ai" ? "bg-indigo-500/20 text-indigo-400" : "bg-zinc-800 text-zinc-400"
                        }`}>
                          {node.type === "trigger" ? "DÉCLENCHEUR" : node.type === "ai" ? "INTELLIGENCE IA" : "ACTION"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon()}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNode(node.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-400 transition-opacity p-0.5"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-white mb-1 tracking-tight truncate">{node.title}</h4>
                      <p className="text-[10px] text-zinc-400 mb-3 leading-snug line-clamp-2">{node.description}</p>
                      
                      {/* Connection handles preview for aesthetic completeness */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[9px] text-zinc-500">
                        <span className="font-mono">ID: {node.id.substring(0, 14)}</span>
                        {node.type === "ai" && <span className="text-indigo-400/80">Gemini 3.5</span>}
                      </div>

                      {/* Status & execution log snapshot */}
                      {node.executionLog && (
                        <div className="mt-2.5 p-1.5 bg-black/40 rounded-lg border border-zinc-800 text-[8px] font-mono text-zinc-400 line-clamp-2 leading-normal">
                          {node.executionLog}
                        </div>
                      )}

                      {/* Connection Handle Dots */}
                      <div className="absolute left-0 top-1/2 -translate-x-1.5 -translate-y-1/2 w-3 h-3 rounded-full bg-[#09090B] border-2 border-indigo-500 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                      </div>
                      <div className="absolute right-0 top-1/2 translate-x-1.5 -translate-y-1/2 w-3 h-3 rounded-full bg-[#09090B] border-2 border-indigo-500 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty Canvas Placeholder */}
                {activeWorkflow?.nodes.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    <Layers className="h-12 w-12 text-zinc-700 mb-3 animate-pulse" />
                    <h3 className="text-sm font-bold text-zinc-400">Votre canevas est vide</h3>
                    <p className="text-xs text-zinc-600 max-w-sm mt-1">
                      Cliquez sur les connecteurs et blocs IA de la barre latérale gauche pour structurer votre premier automatisme.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Executions & Simulation Console Panel */}
              <div className="h-64 border-t border-zinc-800 bg-[#0C0C0E] flex flex-col z-10 shrink-0">
                <div className="px-6 py-2 border-b border-zinc-800 bg-[#09090B] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Console d'exécution du flux</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-3xs text-zinc-500 font-mono">
                      {usesRealGemini ? "⚡ MODE LIVE GEMINI ACTIF" : "🧪 MODE SIMULATION COMPILÉ"}
                    </span>
                    <button
                      onClick={() => {
                        setRunLogs([]);
                        setRunSuccess(null);
                      }}
                      className="text-3xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900 border border-zinc-800"
                    >
                      Effacer
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-zinc-800/80">
                  {/* Trigger payload simulation form */}
                  <div className="w-full md:w-80 p-4 bg-[#09090B]/50 flex flex-col space-y-2 shrink-0">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Données de déclenchement d'essai
                    </label>
                    <p className="text-[10px] text-zinc-500 leading-snug">
                      Modifiez le contenu d'entrée pour tester l'adaptation de l'analyse sentimentale de l'IA.
                    </p>
                    <textarea
                      value={customTriggerInput}
                      onChange={(e) => setCustomTriggerInput(e.target.value)}
                      placeholder='Entrez un texte d&apos;email ou un objet JSON... (ex: "C&apos;est très urgent, je suis bloqué !")'
                      className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-2xs text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-24 md:h-auto"
                    />
                  </div>

                  {/* Sequential Execution Logs */}
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-2xs space-y-3 bg-black/20">
                    {runLogs.length === 0 && !isRunning && (
                      <div className="h-full flex items-center justify-center text-zinc-600 italic">
                        Aucun log d'exécution. Appuyez sur "Lancer le Workflow" pour compiler et exécuter le pipeline.
                      </div>
                    )}

                    {isRunning && (
                      <div className="flex items-center gap-2 text-indigo-400 animate-pulse py-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Compilation du graphe d'événements et dispatch des requêtes IA à l'API Gemini...
                      </div>
                    )}

                    {runLogs.map((log, index) => (
                      <div key={index} className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/60 space-y-2">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-semibold">[{index + 1}]</span>
                            <span className="text-white font-bold">{log.title}</span>
                            <span className="text-zinc-600">({log.type})</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            log.status === "success" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                          }`}>
                            {log.status === "success" ? "SUCCÈS" : "ERREUR"}
                          </span>
                        </div>
                        <p className="text-zinc-400 leading-relaxed text-[11px] whitespace-pre-wrap">{log.log}</p>
                        {log.output && (
                          <details className="text-[10px] bg-black/40 p-2 rounded-lg border border-zinc-900/50">
                            <summary className="text-zinc-500 cursor-pointer hover:text-zinc-300 font-sans select-none">
                              Voir la charge utile de sortie (JSON)
                            </summary>
                            <pre className="mt-2 text-[9px] text-zinc-300 overflow-x-auto text-left leading-normal">
                              {JSON.stringify(log.output, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}

                    {runSuccess === true && (
                      <div className="text-emerald-400 flex items-center gap-1.5 py-1 font-sans font-bold">
                        <CheckCircle2 className="h-4 w-4" />
                        Exécution complétée avec succès ! Le cycle s'est achevé sans erreur.
                      </div>
                    )}

                    {runSuccess === false && (
                      <div className="text-rose-400 flex items-center gap-1.5 py-1 font-sans font-bold">
                        <AlertCircle className="h-4 w-4" />
                        Échec de l'exécution d'un node du workflow.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Properties Inspector Panel */}
            <aside className="w-full lg:w-80 border-l border-zinc-800 bg-[#0C0C0E] p-6 overflow-y-auto flex flex-col shrink-0">
              {selectedNode ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">Inspecteur</h3>
                      <p className="text-[10px] text-zinc-500 font-mono mt-1">ID: {selectedNode.id}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedNodeId(null)}
                      className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  {/* Core fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Titre de l'action</label>
                      <input
                        type="text"
                        value={selectedNode.title}
                        onChange={(e) => updateNodeDetails(selectedNode.id, e.target.value, selectedNode.description)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Description explicative</label>
                      <input
                        type="text"
                        value={selectedNode.description}
                        onChange={(e) => updateNodeDetails(selectedNode.id, selectedNode.title, e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Dynamic Custom Configuration based on Node Category */}
                  <div className="space-y-4 pt-4 border-t border-zinc-800/60">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Configuration spécifique</h4>

                    {/* Gmail Trigger */}
                    {selectedNode.category === "gmail_trigger" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Filtrer par expéditeur ou objet</label>
                          <input
                            type="text"
                            value={selectedNode.config.emailFilter || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "emailFilter", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="ex: support"
                          />
                        </div>
                      </div>
                    )}

                    {/* AI Sentiment */}
                    {selectedNode.category === "ai_sentiment" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Texte d'entrée à analyser par l'IA</label>
                          <input
                            type="text"
                            value={selectedNode.config.sourceText || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "sourceText", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="{{trigger-new.body}}"
                          />
                          <p className="text-[9px] text-zinc-500 mt-1 leading-normal">
                            Utilisez le format double accolade <strong>{`{{node_id.champ}}`}</strong> pour interpoler la sortie des étapes précédentes.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* AI Classify */}
                    {selectedNode.category === "ai_classify" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Texte d'entrée à classifier</label>
                          <input
                            type="text"
                            value={selectedNode.config.sourceText || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "sourceText", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Catégories d'IA possibles (une par ligne)</label>
                          <textarea
                            value={Array.isArray(selectedNode.config.categories) ? selectedNode.config.categories.join("\n") : ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "categories", e.target.value.split("\n"))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-24 font-mono"
                            placeholder="Technique&#10;Facturation&#10;Commercial&#10;Autre"
                          />
                        </div>
                      </div>
                    )}

                    {/* AI Reply / Generation */}
                    {selectedNode.category === "ai_reply" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Instruction de prompt pour Gemini</label>
                          <textarea
                            value={selectedNode.config.prompt || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "prompt", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-24"
                            placeholder="Rédige un email professionnel..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Contexte historique d'entrée</label>
                          <input
                            type="text"
                            value={selectedNode.config.context || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "context", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* AI Summarize */}
                    {selectedNode.category === "ai_summarize" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Texte / Spécifications à résumer</label>
                          <textarea
                            value={selectedNode.config.text || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "text", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20"
                            placeholder="{{trigger-shopify.specs}}"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Style de résumé désiré</label>
                          <input
                            type="text"
                            value={selectedNode.config.style || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "style", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Synthétique, professionnel, optimisé SEO"
                          />
                        </div>
                      </div>
                    )}

                    {/* AI Extract */}
                    {selectedNode.category === "ai_extract" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Texte d'extraction d'attributs</label>
                          <textarea
                            value={selectedNode.config.text || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "text", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Champs structurés à extraire (un par ligne)</label>
                          <textarea
                            value={Array.isArray(selectedNode.config.fields) ? selectedNode.config.fields.join("\n") : ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "fields", e.target.value.split("\n"))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-24 font-mono"
                            placeholder="Matière&#10;Imperméabilité&#10;Poids"
                          />
                        </div>
                      </div>
                    )}

                    {/* AI Agent */}
                    {selectedNode.category === "ai_agent" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Objectif ou mission de l'agent IA</label>
                          <textarea
                            value={selectedNode.config.goal || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "goal", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-24"
                            placeholder="Évaluer le potentiel commercial pour EcoBâtir Solutions..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Informations de contexte enrichies</label>
                          <textarea
                            value={selectedNode.config.context || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "context", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20"
                          />
                        </div>
                      </div>
                    )}

                    {/* Slack Send */}
                    {selectedNode.category === "slack_send" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Canal de destination Slack</label>
                          <input
                            type="text"
                            value={selectedNode.config.channel || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "channel", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="#support-alertes"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Modèle de message enrichi</label>
                          <textarea
                            value={selectedNode.config.message || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "message", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-24"
                            placeholder="Nouveau ticket d'urgence..."
                          />
                        </div>
                      </div>
                    )}

                    {/* HubSpot Lead Contact */}
                    {selectedNode.category === "hubspot_contact" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Nom complet interpolé</label>
                          <input
                            type="text"
                            value={selectedNode.config.fullName || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "fullName", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Raison sociale / Entreprise</label>
                          <input
                            type="text"
                            value={selectedNode.config.company || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "company", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Notes d'IA additionnelles</label>
                          <textarea
                            value={selectedNode.config.notes || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "notes", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20"
                            placeholder="{{ai-agent-1.analysis}}"
                          />
                        </div>
                      </div>
                    )}

                    {/* Gmail Send */}
                    {selectedNode.category === "gmail_send" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Adresse destinataire</label>
                          <input
                            type="text"
                            value={selectedNode.config.to || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "to", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Sujet de l'email</label>
                          <input
                            type="text"
                            value={selectedNode.config.subject || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "subject", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Contenu de l'email rdigé</label>
                          <textarea
                            value={selectedNode.config.body || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "body", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-24"
                          />
                        </div>
                      </div>
                    )}

                    {/* Telegram Send */}
                    {selectedNode.category === "telegram_send" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">ID Canal / Groupe Telegram</label>
                          <input
                            type="text"
                            value={selectedNode.config.chatId || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "chatId", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Modèle de notification Push</label>
                          <textarea
                            value={selectedNode.config.message || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "message", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-24"
                          />
                        </div>
                      </div>
                    )}

                    {/* Stripe Invoice */}
                    {selectedNode.category === "stripe_invoice" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Client ou ID Stripe</label>
                          <input
                            type="text"
                            value={selectedNode.config.customer || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "customer", e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Montant facturé (€)</label>
                          <input
                            type="number"
                            value={selectedNode.config.amount || ""}
                            onChange={(e) => updateNodeConfig(selectedNode.id, "amount", parseFloat(e.target.value))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aesthetic Theme Section */}
                  <div className="pt-6 border-t border-zinc-800 space-y-4">
                    <label className="flex items-center gap-2 mb-2 select-none cursor-pointer">
                      <div className="w-3.5 h-3.5 rounded bg-indigo-600 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-zinc-300">Rcupération d'erreur autonome</span>
                    </label>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      StrongFlow tentera de corriger de manière autonome les éventuels timeouts d'API tiers en recalculant le prompt de secours via Gemini avant de lever une alerte.
                    </p>

                    <button 
                      onClick={() => triggerWorkflowRun(activeWorkflow)}
                      className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-all border border-zinc-700 uppercase tracking-wider cursor-pointer"
                    >
                      Tester cette étape
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 space-y-3">
                  <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500">
                    ✨
                  </div>
                  <div className="text-xs font-semibold">Aucun élément sélectionné</div>
                  <p className="text-[11px] text-zinc-500 max-w-[200px] leading-relaxed">
                    Cliquez sur l'un des blocs du workflow pour configurer ses paramètres et mapper ses variables d'entrée.
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* VIEW 3: CONNECTORS MARKETPLACE */}
        {activeTab === "connectors" && (
          <div className="max-w-7xl mx-auto w-full px-6 py-10 space-y-10">
            
            {/* Header section */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                <Globe className="h-8 w-8 text-indigo-400" />
                Marché des Connecteurs Enterprise
              </h1>
              <p className="text-zinc-400 max-w-2xl text-sm leading-relaxed">
                Connectez vos CRM, messageries, passerelles de paiement et fiches de calculs en quelques clics. StrongFlow AI gère automatiquement la synchronisation bidirectionnelle et l'extraction de variables complexes.
              </p>
            </div>

            {/* Categories filter tabs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Connected Apps count card */}
              <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {connectors.filter(c => c.status === "connected").length} / {connectors.length}
                  </div>
                  <div className="text-xs text-zinc-500 font-medium">Services authentifiés & actifs</div>
                </div>
              </div>

              {/* Encrypted storage assurance */}
              <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Chiffrement AES-256</div>
                  <div className="text-xs text-zinc-500 leading-snug">Vos identifiants et jetons API sont stockés de manière chiffrée de niveau bancaire.</div>
                </div>
              </div>

              {/* API limits status */}
              <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Taux d'appel d'API libre</div>
                  <div className="text-xs text-zinc-500 leading-snug">Aucun throttle d'appel sur vos connecteurs authentifiés dans StrongFlow Enterprise.</div>
                </div>
              </div>
            </div>

            {/* Grid of connectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connectors.map(connector => {
                const isConnected = connector.status === "connected";
                return (
                  <div 
                    key={connector.id} 
                    className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col h-full space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          connector.id === "gmail" ? "bg-blue-500/10 text-blue-400" :
                          connector.id === "slack" ? "bg-purple-500/10 text-purple-400" :
                          connector.id === "stripe" ? "bg-zinc-800 text-white" :
                          connector.id === "hubspot" ? "bg-amber-500/10 text-amber-400" :
                          connector.id === "shopify" ? "bg-emerald-500/10 text-emerald-400" :
                          "bg-emerald-600/10 text-emerald-400"
                        }`}>
                          {connector.name.substring(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{connector.name}</h4>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{connector.category}</span>
                        </div>
                      </div>

                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-3xs font-semibold ${
                        isConnected 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                      }`}>
                        {isConnected ? "Connecté" : "Non configuré"}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed flex-1">
                      {connector.description}
                    </p>

                    <div className="pt-4 border-t border-zinc-900 flex items-center justify-between">
                      {isConnected ? (
                        <>
                          <button
                            onClick={() => handleDisconnectConnector(connector.id)}
                            className="text-2xs font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            Se déconnecter
                          </button>
                          <span className="text-2xs text-emerald-500 flex items-center gap-1">
                            <CheckSquare className="h-3.5 w-3.5" />
                            Actif
                          </span>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConnectConnector(connector)}
                          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-white font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          Configurer le service
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Integration Modal Configurator */}
            {activeConnector && (
              <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <div className="bg-[#0C0C0E] border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                  
                  {/* Modal Header */}
                  <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-base">Configurer {activeConnector.name}</h3>
                      <p className="text-xs text-zinc-500 mt-1">Saisissez vos identifiants sécurisés</p>
                    </div>
                    <button 
                      onClick={() => setActiveConnector(null)}
                      className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-4">
                    <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950 p-3.5 rounded-xl border border-zinc-900">
                      🔒 Vos informations d'identification sont stockées localement de manière chiffrée et ne sont transmises qu'aux serveurs de l'API {activeConnector.name}.
                    </p>

                    {activeConnector.fields.map(f => (
                      <div key={f.name} className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{f.label}</label>
                        <input
                          type={f.type}
                          placeholder={f.placeholder}
                          value={connectorFormValues[f.name] || ""}
                          onChange={(e) => setConnectorFormValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setActiveConnector(null)}
                      className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveConnector}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                    >
                      Sauvegarder la connexion
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
