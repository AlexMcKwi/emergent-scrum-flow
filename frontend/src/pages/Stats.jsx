import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { tasksToCSV, downloadCSV } from "@/lib/csv";
import { toast } from "sonner";

const STATUS_LABELS = { todo: "À faire", in_progress: "En cours", blocked: "Bloqué", done: "Terminé" };
const STATUS_COLORS = { todo: "#A1A4AB", in_progress: "#00E5FF", blocked: "#FF3366", done: "#00F298" };
const PRIORITY_COLORS = { low: "#A1A4AB", medium: "#FFC400", high: "#FF3366" };

export default function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/stats").then((r) => setStats(r.data));
  }, []);

  const exportAll = async () => {
    try {
      const [active, archived] = await Promise.all([
        api.get("/tasks", { params: { archived: false } }),
        api.get("/tasks", { params: { archived: true } }),
      ]);
      const all = [...active.data, ...archived.data];
      if (all.length === 0) {
        toast.error("Aucune tâche à exporter");
        return;
      }
      const csv = tasksToCSV(all);
      const ts = new Date().toISOString().slice(0, 10);
      downloadCSV(`scrumflow-all-${ts}.csv`, csv);
      toast.success(`${all.length} tâche(s) exportée(s)`);
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  if (!stats) return <Layout><p className="label-mono">Chargement…</p></Layout>;

  const statusData = Object.entries(stats.by_status).map(([k, v]) => ({
    name: STATUS_LABELS[k] || k, value: v, fill: STATUS_COLORS[k],
  }));
  const priorityData = Object.entries(stats.by_priority).map(([k, v]) => ({
    name: k, value: v, fill: PRIORITY_COLORS[k],
  }));

  const kpis = [
    { k: "Total", v: stats.total, color: "#F8F9FA" },
    { k: "Actives", v: stats.active, color: "#FF5E00" },
    { k: "Terminées", v: stats.completed, color: "#00F298" },
    { k: "En retard", v: stats.overdue, color: "#FF3366" },
    { k: "Archivées", v: stats.archived, color: "#A1A4AB" },
    { k: "Durée moy. (j)", v: stats.avg_duration_days, color: "#00E5FF" },
  ];

  return (
    <Layout>
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="label-mono text-[#FF5E00]">// STATISTIQUES</p>
          <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter mt-2">Analytics.</h1>
          <p className="text-[#A1A4AB] mt-2">Mesurez votre cadence et votre flow.</p>
        </div>
        <Button
          onClick={exportAll}
          data-testid="export-all-csv-btn"
          variant="outline"
          className="border-white/10 text-white hover:bg-white/5 rounded-sm h-11"
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-10">
        {kpis.map(({ k, v, color }) => (
          <div key={k} className="surface rounded-sm p-5" data-testid={`stats-kpi-${k}`}>
            <p className="label-mono">{k}</p>
            <p className="font-heading font-black text-3xl mt-2 tracking-tighter" style={{ color }}>{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface rounded-sm p-6" data-testid="chart-status">
          <p className="label-mono text-[#FF5E00]">// PAR STATUT</p>
          <h3 className="font-heading text-xl mt-2 mb-6">Répartition</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" stroke="#565961" tick={{ fill: "#A1A4AB", fontSize: 11 }} />
              <YAxis stroke="#565961" tick={{ fill: "#A1A4AB", fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#131418", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4 }} />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="surface rounded-sm p-6" data-testid="chart-priority">
          <p className="label-mono text-[#00E5FF]">// PAR PRIORITÉ</p>
          <h3 className="font-heading text-xl mt-2 mb-6">Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {priorityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Legend wrapperStyle={{ color: "#A1A4AB", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#131418", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  );
}
