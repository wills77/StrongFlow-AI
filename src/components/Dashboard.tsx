import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Zap, TrendingUp, Clock, Coins, Activity, ArrowRight, Play, CheckCircle2, AlertCircle, RefreshCw 
} from "lucide-react";
import { Workflow } from "../types";

interface DashboardProps {
  workflows: Workflow[];
  onSelectWorkflow: (wf: Workflow) => void;
  onTriggerQuickRun: (wf: Workflow) => void;
}

export default function Dashboard({ workflows, onSelectWorkflow, onTriggerQuickRun }: DashboardProps) {
  const [liveEvents, setLiveEvents] = useState<Array<{ id: string; time: string; wfName: string; status: 'success' | 'error'; step: string }>>([
    { id: "1", time: "À l'instant", wfName: "Triage & Auto-Réponse Support Client", status: "success", step: "Email rédigé et envoyé par Gemini AI" },
    { id: "2", time: "Il y a 3 min", wfName: "Enrichissement Shopify & Marketing", status: "success", step: "Alerte envoyée sur Slack #nouveaux-produits" },
    { id: "3", time: "Il y a 7 min", wfName: "Agent IA de Recherche & Qualification de Leads", status: "success", step: "Qualification complétée avec score A-" },
    { id: "4", time: "Il y a 12 min", wfName: "Triage & Auto-Réponse Support Client", status: "success", step: "Sentiment client catégorisé comme Neutre" },
  ]);

  // Calculate stats
  const totalExecutions = workflows.reduce((acc, w) => acc + (w.stats?.executions || 0), 0);
  const averageSuccessRate = workflows.length > 0 
    ? (workflows.reduce((acc, w) => acc + (w.stats?.successRate || 0), 0) / workflows.length).toFixed(1)
    : "100";
  const totalHoursSaved = workflows.reduce((acc, w) => acc + (((w.stats?.executions || 0) * (w.stats?.timeSavedMinutes || 10)) / 60), 0).toFixed(0);
  const estimatedRoi = (parseFloat(totalHoursSaved) * 45).toLocaleString("fr-FR"); // 45€ per hour estimate

  // Periodically add simulated events to feel "live-agent-driven"
  useEffect(() => {
    const interval = setInterval(() => {
      const randomWf = workflows[Math.floor(Math.random() * workflows.length)];
      if (!randomWf) return;
      const steps = [
        "Déclenchement via Webhook",
        "Analyse de document complétée par Gemini",
        "Pipeline achevé avec succès",
        "Variables interpolées et notifiées",
        "Lead synchronisé dans HubSpot CRM"
      ];
      const newEvent = {
        id: Math.random().toString(),
        time: "À l'instant",
        wfName: randomWf.name,
        status: Math.random() > 0.05 ? 'success' as const : 'error' as const,
        step: steps[Math.floor(Math.random() * steps.length)]
      };
      setLiveEvents(prev => [newEvent, ...prev.slice(0, 5)]);
    }, 12000);

    return () => clearInterval(interval);
  }, [workflows]);

  return (
    <div className="space-y-8">
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-radial-[at_20%_20%] from-purple-950/25 via-slate-950 to-slate-950 p-8 md:p-12">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute -bottom-48 -left-48 h-96 w-96 rounded-full bg-emerald-600/5 blur-[120px]" />
        
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
            <Zap className="h-3 w-3 animate-pulse" />
            L'automatisation propulsée par IA de niveau entreprise
          </div>
          <h1 className="font-sans text-3xl md:text-5xl font-bold tracking-tight text-white">
            Automatisez sans limites avec <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">StrongFlow AI</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Créez des agents autonomes et des workflows intelligents. Connectez vos outils préférés et laissez notre IA native analyser, classifier et agir en temps réel.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Automatisations Actives",
            value: workflows.filter(w => w.active).length,
            sub: `Sur ${workflows.length} flux configurés`,
            icon: Activity,
            color: "text-indigo-400",
            bg: "from-indigo-500/10 to-transparent",
            border: "border-indigo-500/20"
          },
          {
            title: "Exécutions Totales",
            value: totalExecutions.toLocaleString("fr-FR"),
            sub: "Derniers 30 jours",
            icon: Zap,
            color: "text-purple-400",
            bg: "from-purple-500/10 to-transparent",
            border: "border-purple-500/20"
          },
          {
            title: "Temps Épargné",
            value: `${totalHoursSaved}h`,
            sub: "Calculé par tâche automatisée",
            icon: Clock,
            color: "text-emerald-400",
            bg: "from-emerald-500/10 to-transparent",
            border: "border-emerald-500/20"
          },
          {
            title: "ROI Estimé (Économies)",
            value: `${estimatedRoi} €`,
            sub: "Basé sur 45€ / heure économisée",
            icon: Coins,
            color: "text-amber-400",
            bg: "from-amber-500/10 to-transparent",
            border: "border-amber-500/20"
          }
        ].map((stat, idx) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`relative overflow-hidden rounded-2xl border ${stat.border} bg-slate-900/60 p-6 backdrop-blur-xl bg-gradient-to-br ${stat.bg}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm font-medium">{stat.title}</span>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div className="mt-4 space-y-1">
              <div className="text-3xl font-bold text-white tracking-tight">{stat.value}</div>
              <div className="text-slate-500 text-xs">{stat.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workflows List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-400" />
              Vos workflows d'automatisation
            </h2>
            <div className="text-xs text-slate-500">Prêts à être lancés</div>
          </div>

          <div className="space-y-4">
            {workflows.map((wf) => (
              <motion.div
                key={wf.id}
                whileHover={{ y: -2 }}
                className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-all hover:border-slate-700/80 hover:bg-slate-900/80"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors">
                        {wf.name}
                      </h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-3xs font-medium ${
                        wf.active 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-slate-800 text-slate-500 border border-slate-700"
                      }`}>
                        {wf.active ? "Actif" : "En pause"}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs line-clamp-2 max-w-xl">
                      {wf.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center self-end">
                    <button
                      onClick={() => onTriggerQuickRun(wf)}
                      className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500 hover:text-white transition-all cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Tester le Flux
                    </button>
                    <button
                      onClick={() => onSelectWorkflow(wf)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:bg-slate-700 transition-all cursor-pointer"
                    >
                      Éditer
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Micro Stats inside card */}
                <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center gap-6 text-2xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Taux de succès : <strong>{wf.stats?.successRate || 100}%</strong></span>
                  </div>
                  <div>
                    Exécutions : <strong className="text-slate-300">{wf.stats?.executions || 0}</strong>
                  </div>
                  <div>
                    Temps saved par ex : <strong className="text-slate-300">{wf.stats?.timeSavedMinutes || 10} min</strong>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Real-time Event Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-400 animate-pulse" />
              Activité en temps réel
            </h2>
            <div className="inline-flex items-center gap-1 text-2xs text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 h-[410px] overflow-y-auto scrollbar-thin">
            {liveEvents.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex gap-3 text-xs border-b border-slate-900 pb-3 last:border-0 last:pb-0"
              >
                <div className="mt-0.5">
                  {ev.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 line-clamp-1">{ev.wfName}</span>
                    <span className="text-slate-500 text-3xs whitespace-nowrap">{ev.time}</span>
                  </div>
                  <p className="text-slate-400 text-2xs leading-relaxed">{ev.step}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
