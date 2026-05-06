import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import TaskModal from "@/components/TaskModal";
import TaskCard from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Plus, CalendarRange, Flame, CheckCheck, AlertTriangle } from "lucide-react";

function startOfWeek(d) {
  const dt = new Date(d);
  const day = dt.getDay() || 7;
  dt.setDate(dt.getDate() - day + 1);
  dt.setHours(0,0,0,0);
  return dt;
}
function endOfWeek(d) {
  const s = startOfWeek(d);
  s.setDate(s.getDate() + 6);
  s.setHours(23,59,59,999);
  return s;
}
const fmtISO = (d) => d.toISOString().slice(0,10);

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stats, setStats] = useState(null);

  const load = async () => {
    const [t, s] = await Promise.all([
      api.get("/tasks", { params: { archived: false } }),
      api.get("/stats"),
    ]);
    setTasks(t.data);
    setStats(s.data);
  };

  useEffect(() => { load(); }, []);

  const today = fmtISO(new Date());
  const weekStart = fmtISO(startOfWeek(new Date()));
  const weekEnd = fmtISO(endOfWeek(new Date()));

  const daily = useMemo(() => tasks.filter((t) =>
    t.status !== "done" && (
      t.due_date === today ||
      t.start_date === today ||
      (t.start_date && t.due_date && t.start_date <= today && t.due_date >= today)
    )
  ), [tasks, today]);

  const weekly = useMemo(() => tasks.filter((t) =>
    t.status !== "done" && (
      (t.due_date && t.due_date >= weekStart && t.due_date <= weekEnd) ||
      (t.start_date && t.start_date >= weekStart && t.start_date <= weekEnd)
    )
  ), [tasks, weekStart, weekEnd]);

  const overdueList = useMemo(() => tasks.filter((t) =>
    t.status !== "done" && t.due_date && t.due_date < today
  ), [tasks, today]);

  const childCount = (id) => tasks.filter((t) => t.parent_id === id).length;

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t) => { setEditing(t); setModalOpen(true); };

  return (
    <Layout>
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="label-mono text-[#FF5E00]" data-testid="dashboard-tagline">// DASHBOARD / OVERVIEW</p>
          <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter mt-2">
            Votre backlog, aujourd'hui.
          </h1>
          <p className="text-[#A1A4AB] mt-2">Vue synthétique quotidienne et hebdomadaire.</p>
        </div>
        <Button
          onClick={openNew}
          data-testid="create-task-btn"
          className="bg-[#FF5E00] hover:bg-[#FF7A33] text-[#0A0A0B] rounded-sm font-semibold h-11"
        >
          <Plus className="w-4 h-4 mr-2" /> Nouvelle tâche
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        {[
          { k: "Actives", v: stats?.active ?? "–", icon: Flame, color: "#FF5E00" },
          { k: "Cette semaine", v: weekly.length, icon: CalendarRange, color: "#00E5FF" },
          { k: "Terminées", v: stats?.completed ?? "–", icon: CheckCheck, color: "#00F298" },
          { k: "En retard", v: stats?.overdue ?? 0, icon: AlertTriangle, color: "#FF3366" },
        ].map(({ k, v, icon: Icon, color }) => (
          <div key={k} className="surface rounded-sm p-6 hover:border-white/20 transition-colors" data-testid={`kpi-${k}`}>
            <div className="flex items-center justify-between">
              <p className="label-mono">{k}</p>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="font-heading font-black text-4xl mt-3 tracking-tighter">{v}</p>
          </div>
        ))}
      </div>

      {/* Daily & Weekly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="surface rounded-sm p-6" data-testid="daily-section">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="label-mono text-[#FF5E00]">// AUJOURD'HUI</p>
              <h2 className="font-heading font-bold text-2xl tracking-tight mt-1">Daily focus</h2>
            </div>
            <span className="label-mono">{daily.length} tâches</span>
          </div>
          <div className="space-y-3">
            {daily.length === 0 && (
              <p className="text-sm text-[#A1A4AB]">Aucune tâche prévue aujourd'hui. Respirez.</p>
            )}
            {daily.map((t) => (
              <TaskCard key={t.id} task={t} childCount={childCount(t.id)} onClick={() => openEdit(t)} />
            ))}
          </div>
        </section>

        <section className="surface rounded-sm p-6" data-testid="weekly-section">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="label-mono text-[#00E5FF]">// SEMAINE</p>
              <h2 className="font-heading font-bold text-2xl tracking-tight mt-1">Weekly sprint</h2>
            </div>
            <span className="label-mono">{weekStart} → {weekEnd}</span>
          </div>
          <div className="space-y-3">
            {weekly.length === 0 && (
              <p className="text-sm text-[#A1A4AB]">Aucune tâche cette semaine.</p>
            )}
            {weekly.map((t) => (
              <TaskCard key={t.id} task={t} childCount={childCount(t.id)} onClick={() => openEdit(t)} />
            ))}
          </div>
        </section>
      </div>

      {overdueList.length > 0 && (
        <section className="surface rounded-sm p-6 mt-6 border-l-2 border-l-[#FF3366]" data-testid="overdue-section">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="label-mono text-[#FF3366]">// RETARD</p>
              <h2 className="font-heading font-bold text-2xl tracking-tight mt-1">À rattraper</h2>
            </div>
            <span className="label-mono">{overdueList.length}</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {overdueList.map((t) => (
              <TaskCard key={t.id} task={t} childCount={childCount(t.id)} onClick={() => openEdit(t)} />
            ))}
          </div>
        </section>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editing}
        allTasks={tasks}
        onSaved={() => load()}
        onDeleted={() => load()}
      />
    </Layout>
  );
}
