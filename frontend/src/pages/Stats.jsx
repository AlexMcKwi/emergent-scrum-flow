import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_LABELS = { todo: "À faire", in_progress: "En cours", blocked: "Bloqué", done: "Terminé" };
const STATUS_COLORS = { todo: "#A1A4AB", in_progress: "#00E5FF", blocked: "#FF3366", done: "#00F298" };
const PRIORITY_COLORS = { low: "#A1A4AB", medium: "#FFC400", high: "#FF3366" };

export default function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/stats").then((r) => setStats(r.data));
  }, []);

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
      <div className="mb-10">
        <p className="label-mono text-[#FF5E00]">// STATISTIQUES</p>
        <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter mt-2">Analytics.</h1>
        <p className="text-[#A1A4AB] mt-2">Mesurez votre cadence et votre flow.</p>
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
