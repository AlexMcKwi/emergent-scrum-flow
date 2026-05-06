import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  ComposedChart, Line, CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Download, Zap } from "lucide-react";
import { tasksToCSV, downloadCSV } from "@/lib/csv";
import { toast } from "sonner";

const STATUS_LABELS = { todo: "À faire", in_progress: "En cours", blocked: "Bloqué", done: "Terminé" };
const STATUS_COLORS = { todo: "#A1A4AB", in_progress: "#00E5FF", blocked: "#FF3366", done: "#00F298" };
const PRIORITY_COLORS = { low: "#A1A4AB", medium: "#FFC400", high: "#FF3366" };

function shortLabel(iso) {
  // "2026-02-09" -> "9/2"
  const [y, m, d] = iso.split("-");
  return `${parseInt(d, 10)}/${parseInt(m, 10)}`;
}

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

  const weekly = stats.weekly_velocity || [];
  // Compute 3-week rolling moving average for trend line
  const velocityData = weekly.map((w, idx) => {
    const slice = weekly.slice(Math.max(0, idx - 2), idx + 1);
    const avg = slice.reduce((s, x) => s + (x.points || 0), 0) / slice.length;
    return {
      week: shortLabel(w.start),
      points: w.points,
      tasks: w.tasks,
      trend: Math.round(avg * 10) / 10,
    };
  });

  const kpis = [
    { k: "Total", v: stats.total, color: "#F8F9FA" },
    { k: "Actives", v: stats.active, color: "#FF5E00" },
    { k: "Terminées", v: stats.completed, color: "#00F298" },
    { k: "En retard", v: stats.overdue, color: "#FF3366" },
    { k: "Archivées", v: stats.archived, color: "#A1A4AB" },
    { k: "Durée moy. (j)", v: stats.avg_duration_days, color: "#00E5FF" },
  ];

  const spKpis = [
    { k: "SP livrés (total)", v: stats.total_points_completed ?? 0, color: "#00F298", icon: Zap },
    { k: "SP en cours", v: stats.points_active ?? 0, color: "#FF5E00", icon: Zap },
    { k: "Velocity moy. (SP/sem)", v: stats.velocity_avg ?? 0, color: "#00E5FF", icon: Zap },
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

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {kpis.map(({ k, v, color }) => (
          <div key={k} className="surface rounded-sm p-5" data-testid={`stats-kpi-${k}`}>
            <p className="label-mono">{k}</p>
            <p className="font-heading font-black text-3xl mt-2 tracking-tighter" style={{ color }}>{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {spKpis.map(({ k, v, color, icon: Icon }) => (
          <div key={k} className="surface rounded-sm p-5 flex items-start justify-between" data-testid={`stats-sp-kpi-${k}`}>
            <div>
              <p className="label-mono">{k}</p>
              <p className="font-heading font-black text-4xl mt-2 tracking-tighter" style={{ color }}>{v}</p>
            </div>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        ))}
      </div>

      <div className="surface rounded-sm p-6 mb-6" data-testid="chart-velocity">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="label-mono text-[#FF5E00]">// VELOCITY (8 semaines)</p>
            <h3 className="font-heading text-xl mt-2">Story points livrés par semaine</h3>
          </div>
          <p className="label-mono">moy. {stats.velocity_avg ?? 0} SP/sem</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={velocityData}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="week" stroke="#565961" tick={{ fill: "#A1A4AB", fontSize: 11 }} />
            <YAxis stroke="#565961" tick={{ fill: "#A1A4AB", fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#131418", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4 }}
              labelStyle={{ color: "#A1A4AB" }}
            />
            <Bar dataKey="points" name="SP livrés" fill="#FF5E00" radius={[2, 2, 0, 0]} />
            <Line type="monotone" dataKey="trend" name="Tendance (3-sem)" stroke="#00E5FF" strokeWidth={2} dot={{ r: 3, fill: "#00E5FF" }} />
          </ComposedChart>
        </ResponsiveContainer>
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
