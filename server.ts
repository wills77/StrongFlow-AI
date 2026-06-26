import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini AI Client lazily or check safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

const WORKFLOWS_FILE = path.join(process.cwd(), "workflows.json");

// Default premium preset templates
const defaultWorkflows = [
  {
    id: "template-support-triage",
    name: "Triage & Auto-Réponse Support Client",
    description: "Analyse le sentiment des emails entrants, classifie la demande et rédige une réponse personnalisée par IA.",
    active: true,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        category: "gmail_trigger",
        title: "Nouvel Email Client",
        description: "Déclenché par la boîte de réception support@company.com",
        position: { x: 50, y: 150 },
        config: { emailFilter: "support" },
        outputData: {
          sender: "client@exemple.fr",
          subject: "Problème d'accès à mon compte premium",
          body: "Bonjour, je n'arrive plus à me connecter à mon tableau de bord depuis ce matin. Mon mot de passe semble refusé et je n'ai pas reçu le mail de réinitialisation. C'est très urgent car nous avons une démo client dans 2 heures ! Merci d'avance."
        }
      },
      {
        id: "ai-sentiment-1",
        type: "ai",
        category: "ai_sentiment",
        title: "Analyse du Sentiment",
        description: "Évalue l'urgence et le ton de l'email",
        position: { x: 300, y: 100 },
        config: { sourceText: "{{trigger-1.body}}" },
        outputData: null
      },
      {
        id: "ai-classify-1",
        type: "ai",
        category: "ai_classify",
        title: "Classification IA",
        description: "Catégorise la demande (Technique, Facturation...)",
        position: { x: 300, y: 280 },
        config: {
          sourceText: "{{trigger-1.body}}",
          categories: ["Technique", "Facturation", "Commercial", "Autre"]
        },
        outputData: null
      },
      {
        id: "ai-reply-1",
        type: "ai",
        category: "ai_reply",
        title: "Rdaction de la Réponse",
        description: "Rédige un brouillon de réponse empathique et pro",
        position: { x: 580, y: 180 },
        config: {
          prompt: "Rédige un email de réponse en français pour l'expéditeur {{trigger-1.sender}}. Le problème est: {{trigger-1.subject}}. Le sentiment détecté est {{ai-sentiment-1.sentiment}} et la catégorie est {{ai-classify-1.category}}. Propose une réponse rassurante.",
          context: "{{trigger-1.body}}"
        },
        outputData: null
      },
      {
        id: "action-slack-1",
        type: "action",
        category: "slack_send",
        title: "Alerte Slack Urgente",
        description: "Alerte l'équipe si le sentiment est négatif",
        position: { x: 850, y: 80 },
        config: {
          channel: "support-prioritaire",
          message: "🚨 *Urgence Client* détectée ! \n*Client :* {{trigger-1.sender}} \n*Sujet :* {{trigger-1.subject}} \n*Sentiment :* {{ai-sentiment-1.sentiment}} \n*Catégorie :* {{ai-classify-1.category}}"
        },
        outputData: null
      },
      {
        id: "action-gmail-1",
        type: "action",
        category: "gmail_send",
        title: "Envoyer Réponse Client",
        description: "Envoie l'email rédigé par l'IA",
        position: { x: 850, y: 280 },
        config: {
          to: "{{trigger-1.sender}}",
          subject: "Re: {{trigger-1.subject}}",
          body: "{{ai-reply-1.reply}}"
        },
        outputData: null
      }
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "ai-sentiment-1" },
      { id: "e2", source: "trigger-1", target: "ai-classify-1" },
      { id: "e3", source: "ai-sentiment-1", target: "ai-reply-1" },
      { id: "e4", source: "ai-classify-1", target: "ai-reply-1" },
      { id: "e5", source: "ai-reply-1", target: "action-slack-1" },
      { id: "e6", source: "ai-reply-1", target: "action-gmail-1" }
    ],
    stats: {
      executions: 1240,
      successRate: 98.7,
      timeSavedMinutes: 10, // 10 minutes saved per run
    }
  },
  {
    id: "template-shopify-desc",
    name: "Enrichissement Shopify & Marketing",
    description: "Génère automatiquement une fiche produit optimisée SEO et des publications réseaux sociaux à partir de spécifications brutes.",
    active: false,
    nodes: [
      {
        id: "trigger-shopify",
        type: "trigger",
        category: "shopify_product",
        title: "Nouveau Produit Shopify",
        description: "Déclenché quand un produit brut est créé",
        position: { x: 50, y: 200 },
        config: {},
        outputData: {
          title: "Veste ThermoActive Storm-01",
          vendor: "StrongGear",
          tags: "veste, sport, hiver",
          specs: "Veste coupe-vent imperméable. Technologie de régulation thermique passive. Tissu recyclé à 85%. Capuche amovible. Poche intérieure RFID. Poids 450g."
        }
      },
      {
        id: "ai-summarize-1",
        type: "ai",
        category: "ai_summarize",
        title: "Descriptif Produit IA",
        description: "Rédige une fiche produit attrayante et SEO-friendly",
        position: { x: 320, y: 100 },
        config: {
          text: "Produit: {{trigger-shopify.title}}\nSpécifications: {{trigger-shopify.specs}}",
          style: "Marketing convaincant et technique, optimisé pour la vente en ligne."
        },
        outputData: null
      },
      {
        id: "ai-extract-1",
        type: "ai",
        category: "ai_extract",
        title: "Extraction d'Attributs",
        description: "Extrait les données clés de manière structurée",
        position: { x: 320, y: 300 },
        config: {
          text: "{{trigger-shopify.specs}}",
          fields: ["Imperméabilité", "Matière", "Poids", "Sécurité"]
        },
        outputData: null
      },
      {
        id: "action-slack-shopify",
        type: "action",
        category: "slack_send",
        title: "Notifier Équipe Produit",
        description: "Partage la fiche et les détails extraits sur Slack",
        position: { x: 650, y: 200 },
        config: {
          channel: "nouveaux-produits",
          message: "🎉 *Nouveau produit enrichi par l'IA StrongFlow !*\n\n*Nom :* {{trigger-shopify.title}}\n\n*Description IA :*\n{{ai-summarize-1.summary}}\n\n*Spécifications extraites :*\n- Matière: {{ai-extract-1.Matière}}\n- Sécurité: {{ai-extract-1.Sécurité}}\n- Poids: {{ai-extract-1.Poids}}"
        },
        outputData: null
      }
    ],
    edges: [
      { id: "e-s1", source: "trigger-shopify", target: "ai-summarize-1" },
      { id: "e-s2", source: "trigger-shopify", target: "ai-extract-1" },
      { id: "e-s3", source: "ai-summarize-1", target: "action-slack-shopify" },
      { id: "e-s4", source: "ai-extract-1", target: "action-slack-shopify" }
    ],
    stats: {
      executions: 412,
      successRate: 100,
      timeSavedMinutes: 15,
    }
  },
  {
    id: "template-lead-enrich",
    name: "Agent IA de Recherche & Qualification de Leads",
    description: "Recherche sur le web les informations sur un nouveau lead Google Sheets et propose un score d'opportunité commerciale.",
    active: true,
    nodes: [
      {
        id: "trigger-sheets",
        type: "trigger",
        category: "sheets_trigger",
        title: "Nouvelle Ligne Google Sheets",
        description: "Détecte un nouveau formulaire d'inscription lead",
        position: { x: 50, y: 200 },
        config: { spreadsheetId: "Formulaire-Leads" },
        outputData: {
          name: "Jean Dupont",
          company: "EcoBâtir Solutions",
          website: "https://www.ecobati-solutions.fr",
          companySize: "12-50",
          interest: "Formule Pro Automation"
        }
      },
      {
        id: "ai-agent-1",
        type: "ai",
        category: "ai_agent",
        title: "Agent IA Autonome",
        description: "Simule la qualification approfondie et évalue le ROI potentiel",
        position: { x: 350, y: 200 },
        config: {
          goal: "Évaluer le potentiel commercial pour EcoBâtir Solutions. Proposer un scénario d'usage et un score de qualification (A, B, C, D) avec argumentation.",
          context: "Lead: {{trigger-sheets.name}}, Société: {{trigger-sheets.company}}, Site web: {{trigger-sheets.website}}, Intérêt: {{trigger-sheets.interest}}, Taille: {{trigger-sheets.companySize}}"
        },
        outputData: null
      },
      {
        id: "action-hubspot-1",
        type: "action",
        category: "hubspot_contact",
        title: "Créer Contact HubSpot",
        description: "Synchronise le contact qualifié avec son score",
        position: { x: 680, y: 100 },
        config: {
          fullName: "{{trigger-sheets.name}}",
          company: "{{trigger-sheets.company}}",
          notes: "Rapport de qualification de l'Agent StrongFlow :\n{{ai-agent-1.analysis}}"
        },
        outputData: null
      },
      {
        id: "action-telegram-1",
        type: "action",
        category: "telegram_send",
        title: "Notifier l'Équipe Commerciale",
        description: "Envoie les détails qualifiés aux commerciaux sur Telegram",
        position: { x: 680, y: 300 },
        config: {
          chatId: "commerciaux_strongflow",
          message: "🔥 *Nouveau lead qualifié à haute valeur !*\n*Nom:* {{trigger-sheets.name}}\n*Entreprise:* {{trigger-sheets.company}}\n*Analyse Agent IA :*\n{{ai-agent-1.analysis}}"
        },
        outputData: null
      }
    ],
    edges: [
      { id: "e-l1", source: "trigger-sheets", target: "ai-agent-1" },
      { id: "e-l2", source: "ai-agent-1", target: "action-hubspot-1" },
      { id: "e-l3", source: "ai-agent-1", target: "action-telegram-1" }
    ],
    stats: {
      executions: 189,
      successRate: 95.8,
      timeSavedMinutes: 25,
    }
  }
];

// Helper to load workflows
const loadWorkflows = () => {
  try {
    if (fs.existsSync(WORKFLOWS_FILE)) {
      const raw = fs.readFileSync(WORKFLOWS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading workflows, using defaults", err);
  }
  // If not exist, write defaults
  try {
    fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(defaultWorkflows, null, 2), "utf-8");
  } catch (e) {
    console.error("Could not write initial default workflows file", e);
  }
  return defaultWorkflows;
};

let workflowsDb = loadWorkflows();

// API: Get all workflows
app.get("/api/workflows", (req, res) => {
  res.json(workflowsDb);
});

// API: Create or update workflow
app.post("/api/workflows", (req, res) => {
  const workflow = req.body;
  if (!workflow.id) {
    workflow.id = "wf-" + Math.random().toString(36).substring(2, 9);
  }
  
  const existingIdx = workflowsDb.findIndex((w: any) => w.id === workflow.id);
  if (existingIdx >= 0) {
    workflowsDb[existingIdx] = { ...workflowsDb[existingIdx], ...workflow };
  } else {
    workflowsDb.push(workflow);
  }

  try {
    fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflowsDb, null, 2), "utf-8");
  } catch (e) {
    console.error("Could not save workflows file", e);
  }
  res.json(workflow);
});

// API: Delete workflow
app.delete("/api/workflows/:id", (req, res) => {
  const { id } = req.params;
  workflowsDb = workflowsDb.filter((w: any) => w.id !== id);
  try {
    fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflowsDb, null, 2), "utf-8");
  } catch (e) {
    console.error("Could not save workflows file", e);
  }
  res.json({ success: true });
});

// Helper to replace variable interpolation in text (e.g. {{node-id.property}})
const interpolateVariables = (text: string, context: Record<string, any>) => {
  if (!text || typeof text !== "string") return text;
  return text.replace(/\{\{([^}]+)\}\}/g, (match, pathStr) => {
    const cleanPath = pathStr.trim();
    const parts = cleanPath.split(".");
    let current = context;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return match; // Return original if not found
      }
    }
    return typeof current === "object" ? JSON.stringify(current) : String(current);
  });
};

// API: RUN Workflow Engine with Actual Gemini Execution!
app.post("/api/workflows/run", async (req, res) => {
  const { workflow, triggerInput } = req.body;
  if (!workflow || !workflow.nodes) {
    return res.status(400).json({ error: "Structure de workflow manquante ou invalide" });
  }

  console.log(`Starting execution for workflow: ${workflow.name || "Custom"}`);
  
  const nodes = workflow.nodes;
  const edges = workflow.edges || [];
  
  // Store node outputs for interpolation. Trigger starts with initial input
  const executionContext: Record<string, any> = {};
  
  // Find trigger node
  const triggerNode = nodes.find((n: any) => n.type === "trigger");
  if (triggerNode) {
    const inputToUse = triggerInput || triggerNode.outputData || {};
    executionContext[triggerNode.id] = inputToUse;
    triggerNode.outputData = inputToUse;
    triggerNode.status = "success";
    triggerNode.executionLog = "Déclencheur activé avec succès. Données reçues.";
  }

  // To execute nodes in correct dependencies, we do a topological/sequential order
  // For safety in this demo, let's sort nodes. A simpler BFS/topological queue works beautifully.
  const visited = new Set<string>();
  if (triggerNode) {
    visited.add(triggerNode.id);
  }

  const runLogs: Array<{ nodeId: string; title: string; type: string; status: "success" | "error" | "pending"; log: string; output: any }> = [];
  if (triggerNode) {
    runLogs.push({
      nodeId: triggerNode.id,
      title: triggerNode.title,
      type: triggerNode.category,
      status: "success",
      log: "Déclenché avec données : " + JSON.stringify(triggerNode.outputData, null, 2),
      output: triggerNode.outputData
    });
  }

  const aiClient = getGeminiClient();
  const usesRealGemini = aiClient !== null;
  console.log(`Gemini status: ${usesRealGemini ? "REAL LIVE GENERATION ACTIVE" : "SIMULATED AI ACTIVE"}`);

  // We process the remaining nodes iteratively based on satisfied incoming dependencies
  let progress = true;
  const maxIterations = 50;
  let iterations = 0;

  while (progress && iterations < maxIterations) {
    progress = false;
    iterations++;

    for (const node of nodes) {
      if (node.type === "trigger" || visited.has(node.id)) {
        continue;
      }

      // Check if all parent nodes are visited (satisfied)
      const incomingEdges = edges.filter((e: any) => e.target === node.id);
      const allParentsSatisfied = incomingEdges.every((e: any) => visited.has(e.source));

      if (allParentsSatisfied && (incomingEdges.length > 0 || visited.size > 0)) {
        // We can execute this node!
        visited.add(node.id);
        progress = true;

        node.status = "running";
        console.log(`Executing node: ${node.title} (${node.category})`);

        // Prepare context-specific config by interpolating parameters
        const interpolatedConfig: Record<string, any> = {};
        if (node.config) {
          for (const key of Object.keys(node.config)) {
            const val = node.config[key];
            if (typeof val === "string") {
              interpolatedConfig[key] = interpolateVariables(val, executionContext);
            } else if (Array.isArray(val)) {
              interpolatedConfig[key] = val.map(item => typeof item === "string" ? interpolateVariables(item, executionContext) : item);
            } else {
              interpolatedConfig[key] = val;
            }
          }
        }

        let nodeOutput: Record<string, any> = {};
        let executionLog = "";

        try {
          if (node.type === "ai") {
            if (usesRealGemini && aiClient) {
              // Real Gemini Call!
              if (node.category === "ai_sentiment") {
                const textToAnalyze = interpolatedConfig.sourceText || "Pas de contenu";
                const response = await aiClient.models.generateContent({
                  model: "gemini-3.5-flash",
                  contents: `Fais une analyse de sentiment ultra précise sur le texte ci-dessous. Tu dois répondre UNIQUEMENT par un objet JSON valide avec la structure suivante: {"sentiment": "Positif" | "Neutre" | "Négatif", "confidence": <nombre de 0 à 1>, "reason": "<explication courte>"}.\n\nTexte: "${textToAnalyze}"`,
                  config: { responseMimeType: "application/json" }
                });
                
                try {
                  nodeOutput = JSON.parse(response.text?.trim() || "{}");
                } catch {
                  // Fallback in case response is not clean JSON
                  nodeOutput = { sentiment: response.text?.includes("Négatif") ? "Négatif" : "Positif", confidence: 0.9, reason: response.text || "Analyse effectuée." };
                }
                executionLog = `Analyse Gemini complétée: ${nodeOutput.sentiment} (${Math.round((nodeOutput.confidence || 0.8) * 100)}% confiance). Raison: ${nodeOutput.reason}`;
              } 
              
              else if (node.category === "ai_classify") {
                const textToClassify = interpolatedConfig.sourceText || "Pas de contenu";
                const categories = interpolatedConfig.categories || ["Technique", "Facturation", "Commercial", "Autre"];
                const response = await aiClient.models.generateContent({
                  model: "gemini-3.5-flash",
                  contents: `Classifie le texte ci-dessous dans l'une des catégories suivantes: ${categories.join(", ")}. Tu dois répondre UNIQUEMENT par un objet JSON valide avec la structure suivante: {"category": "<nom de la catégorie choisie>", "confidence": <nombre de 0 à 1>, "explanation": "<raison courte>"}.\n\nTexte: "${textToClassify}"`,
                  config: { responseMimeType: "application/json" }
                });
                
                try {
                  nodeOutput = JSON.parse(response.text?.trim() || "{}");
                } catch {
                  nodeOutput = { category: categories[0], confidence: 0.85, explanation: "Classification automatique." };
                }
                executionLog = `Classification Gemini complétée: Catégorie "${nodeOutput.category}" (${Math.round((nodeOutput.confidence || 0.85) * 100)}% confiance).`;
              } 
              
              else if (node.category === "ai_reply") {
                const promptTemplate = interpolatedConfig.prompt || "";
                const contextText = interpolatedConfig.context || "";
                const response = await aiClient.models.generateContent({
                  model: "gemini-3.5-flash",
                  contents: `Agis comme un assistant de messagerie intelligent et professionnel. Suis l'instruction de rédaction suivante:\n\n${promptTemplate}\n\nContexte d'origine:\n"${contextText}"\n\nRédige la réponse de manière fluide, polie, et directement prête à être envoyée (pas d'intro meta-texte ou de salutations artificielles hors contexte).`
                });
                nodeOutput = { reply: response.text?.trim() };
                executionLog = "Brouillon de réponse intelligent rédigé avec succès par Gemini.";
              } 
              
              else if (node.category === "ai_summarize") {
                const textToSummarize = interpolatedConfig.text || "Pas de contenu";
                const styleInstruction = interpolatedConfig.style || "Synthétique et professionnel.";
                const response = await aiClient.models.generateContent({
                  model: "gemini-3.5-flash",
                  contents: `Rédige un résumé structuré et attrayant du texte ci-dessous. Suis ces consignes de style: ${styleInstruction}.\n\nTexte à résumer:\n"${textToSummarize}"`
                });
                nodeOutput = { summary: response.text?.trim() };
                executionLog = "Résumé de document généré avec succès par Gemini.";
              } 
              
              else if (node.category === "ai_extract") {
                const sourceText = interpolatedConfig.text || "";
                const fieldsToExtract = interpolatedConfig.fields || ["Nom", "Valeur"];
                
                const propertiesSchema: Record<string, any> = {};
                fieldsToExtract.forEach((f: string) => {
                  propertiesSchema[f] = { type: Type.STRING, description: `Valeur extraite pour le champ ${f}` };
                });

                const response = await aiClient.models.generateContent({
                  model: "gemini-3.5-flash",
                  contents: `Extrais précisément les informations suivantes du texte: ${fieldsToExtract.join(", ")}.\n\nTexte: "${sourceText}"`,
                  config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                      type: Type.OBJECT,
                      properties: propertiesSchema,
                      required: fieldsToExtract
                    }
                  }
                });
                
                try {
                  nodeOutput = JSON.parse(response.text?.trim() || "{}");
                } catch {
                  nodeOutput = {};
                  fieldsToExtract.forEach((f: string) => { nodeOutput[f] = "Donnée indisponible"; });
                }
                executionLog = `Informations clés extraites avec succès sous forme de données structurées.`;
              } 
              
              else if (node.category === "ai_agent") {
                const goal = interpolatedConfig.goal || "Analyser la demande";
                const context = interpolatedConfig.context || "";
                const response = await aiClient.models.generateContent({
                  model: "gemini-3.5-flash",
                  contents: `Tu es un Agent IA de StrongFlow AI doté de capacités d'analyse avancée et de planification. Ton but est: "${goal}".\nVoici le contexte d'exécution: "${context}".\nRédige un rapport de qualification complet avec un plan d'action commercial détaillé, des propositions concrètes de personnalisation, et des conseils stratégiques.`
                });
                nodeOutput = { analysis: response.text?.trim() };
                executionLog = "L'Agent IA autonome StrongFlow a complété sa mission de recherche et de qualification avec succès.";
              }
            } else {
              // Simulated Gemini - Premium look & content
              await new Promise(resolve => setTimeout(resolve, 1000)); // simulate network delay
              
              if (node.category === "ai_sentiment") {
                const isUrgent = (interpolatedConfig.sourceText || "").toLowerCase().includes("urgent") || (interpolatedConfig.sourceText || "").toLowerCase().includes("bloqué");
                nodeOutput = {
                  sentiment: isUrgent ? "Négatif" : "Positif",
                  confidence: 0.94,
                  reason: isUrgent ? "Le client montre une frustration et une urgence temporelle critique." : "Le ton global est collaboratif et standard."
                };
                executionLog = `[Simulé StrongFlow] Sentiment détecté: ${nodeOutput.sentiment} (94% de confiance).`;
              } 
              
              else if (node.category === "ai_classify") {
                const bodyText = (interpolatedConfig.sourceText || "").toLowerCase();
                let category = "Technique";
                if (bodyText.includes("facture") || bodyText.includes("paye") || bodyText.includes("tarif") || bodyText.includes("premium")) {
                  category = "Facturation";
                }
                nodeOutput = {
                  category,
                  confidence: 0.88,
                  explanation: `Détecté par analyse sémantique des mots clés liés à la catégorie.`
                };
                executionLog = `[Simulé StrongFlow] Classifié dans la catégorie "${category}" avec succès.`;
              } 
              
              else if (node.category === "ai_reply") {
                const sentiment = executionContext["ai-sentiment-1"]?.sentiment || "Négatif";
                const category = executionContext["ai-classify-1"]?.category || "Technique";
                
                nodeOutput = {
                  reply: `Bonjour,\n\nJe prends connaissance à l'instant de votre problème d'accès premium. C'est tout à fait anormal et je comprends l'urgence pour votre démo.\n\nNotre équipe technique vient de forcer la réinitialisation de votre compte. Vous allez recevoir un email contenant votre nouveau lien d'accès sécurisé sous 2 minutes.\n\nNous restons à votre entière disposition pour nous assurer que tout fonctionne bien d'ici votre réunion.\n\nCordialement,\nL'équipe StrongFlow Support`
                };
                executionLog = `[Simulé StrongFlow] Brouillon de réponse rédigé automatiquement avec succès.`;
              } 
              
              else if (node.category === "ai_summarize") {
                nodeOutput = {
                  summary: `• **Produit :** Veste ThermoActive Storm-01 (Marque: StrongGear)\n• **Technologie :** Régulation thermique passive de pointe.\n• **Conception Écoresponsable :** Conçue avec 85% de matières textiles hautement recyclées.\n• **Atouts Clés :** Coupe-vent imperméable, capuche amovible et poche de sécurité anti-piratage RFID.`
                };
                executionLog = `[Simulé StrongFlow] Résumé optimisé SEO généré avec succès.`;
              } 
              
              else if (node.category === "ai_extract") {
                nodeOutput = {
                  "Imperméabilité": "Excellente (coupe-vent)",
                  "Matière": "85% Tissu recyclé",
                  "Poids": "450g",
                  "Sécurité": "Poche intérieure RFID"
                };
                executionLog = `[Simulé StrongFlow] Extraction structurée de 4 attributs clés complétée.`;
              } 
              
              else if (node.category === "ai_agent") {
                nodeOutput = {
                  analysis: `🏆 **RAPPORT DE QUALIFICATION DE L'AGENT IA STRONGFLOW** 🏆\n\n**1. Profil de l'opportunité :** EcoBâtir Solutions (Taille: 12-50 employés)\n**2. Score d'opportunité :** **A- (Très Chaud)**\n\n**3. Scénario d'Usage Recommandé :**\nL'entreprise s'intéresse à la "Formule Pro Automation". Étant dans le secteur éco-construction, ils ont probablement besoin d'automatiser le flux de prospection, le suivi de chantiers, et la mise à jour de leur CRM après signature de devis Google Sheets.\n\n**4. Plan d'Action Recommandé :**\n• Envoyer une invitation automatique pour un appel de cadrage personnalisé de 15 minutes.\n• Proposer une démo de workflow axée sur l'envoi de contrats automatisés avec signature électronique.\n• Offrir une réduction de lancement de 15% pour inciter à la signature sous 10 jours.`
                };
                executionLog = `[Simulé StrongFlow] Qualification d'agent complétée avec un score de A-.`;
              }
            }
          } 
          
          else if (node.type === "action") {
            // Simulated third-party integrations
            await new Promise(resolve => setTimeout(resolve, 800));
            
            if (node.category === "slack_send") {
              const channel = interpolatedConfig.channel || "general";
              const message = interpolatedConfig.message || "";
              nodeOutput = { sent: true, channel, message, timestamp: new Date().toISOString() };
              executionLog = `Message envoyé sur Slack (#${channel}) : "${message.substring(0, 80)}..."`;
            } 
            
            else if (node.category === "gmail_send") {
              const to = interpolatedConfig.to || "recipient@example.com";
              const subject = interpolatedConfig.subject || "No Subject";
              const body = interpolatedConfig.body || "";
              nodeOutput = { sent: true, to, subject, bodySize: body.length };
              executionLog = `Email envoyé à <${to}> avec pour sujet "${subject}".`;
            } 
            
            else if (node.category === "hubspot_contact") {
              const fullName = interpolatedConfig.fullName || "Inconnu";
              const company = interpolatedConfig.company || "Non renseignée";
              nodeOutput = { created: true, id: "hs_contact_" + Math.floor(Math.random() * 1000000), fullName, company };
              executionLog = `Contact créé/mis à jour dans HubSpot CRM : ${fullName} (${company}).`;
            } 
            
            else if (node.category === "telegram_send") {
              const chatId = interpolatedConfig.chatId || "commerciaux";
              const message = interpolatedConfig.message || "";
              nodeOutput = { sent: true, chatId, messageLength: message.length };
              executionLog = `Alerte push envoyée au canal Telegram @${chatId}.`;
            } 
            
            else if (node.category === "stripe_invoice") {
              const customer = interpolatedConfig.customer || "client";
              const amount = interpolatedConfig.amount || 49.00;
              nodeOutput = { invoiceId: "in_stripe_" + Math.floor(Math.random() * 100000), customer, amount, status: "draft" };
              executionLog = `Facture Stripe de ${amount}€ générée au statut Brouillon pour ${customer}.`;
            } 
            
            else if (node.category === "sheets_append") {
              nodeOutput = { appended: true, rows: 1 };
              executionLog = `Nouvelle ligne ajoutée dans Google Sheets.`;
            } 
            
            else {
              nodeOutput = { success: true };
              executionLog = `Intégration ${node.category} exécutée de manière fluide.`;
            }
          }

          node.status = "success";
          node.outputData = nodeOutput;
          node.executionLog = executionLog;

          // Save node state in run logs and execution context
          executionContext[node.id] = nodeOutput;
          runLogs.push({
            nodeId: node.id,
            title: node.title,
            type: node.category,
            status: "success",
            log: executionLog,
            output: nodeOutput
          });

        } catch (err: any) {
          console.error(`Error in node ${node.id}:`, err);
          node.status = "error";
          node.executionLog = `Erreur lors de l'exécution: ${err.message || err}`;
          
          runLogs.push({
            nodeId: node.id,
            title: node.title,
            type: node.category,
            status: "error",
            log: `Erreur: ${err.message || err}`,
            output: null
          });
          // Stop execution of descendants on error
          break;
        }
      }
    }
  }

  // Finalize execution response
  res.json({
    success: true,
    workflowId: workflow.id,
    logs: runLogs,
    finalContext: executionContext,
    usesRealGemini
  });
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StrongFlow AI Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server", err);
});
