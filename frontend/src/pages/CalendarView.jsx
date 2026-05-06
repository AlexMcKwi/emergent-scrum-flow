import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import TaskModal from "@/components/TaskModal";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const STATUS_COLORS = {
  todo: "#A1A4AB",
  in_progress: "#00E5FF",
  blocked: "#FF3366",
  done: "#00F298",
};

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const fmt = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function getMonthGrid(year, month) {
  // month: 0-11. Returns 6 weeks x 7 days, starting on Monday.
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Monday=0
  const start = new Date(year, month, 1 - startWeekday);
  const grid = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + w * 7 + d);
      week.push(dt);
    }
    grid.push(week);
  }
  return grid;
}

export default function CalendarView() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [tasks, setTasks] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [presetDate, setPresetDate] = useState(null);

  const load = async () => {
    const res = await api.get("/tasks", { params: { archived: false } });
    setTasks(res.data);
  };
  useEffect(() => { load(); }, []);

  const grid = useMemo(
    () => getMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  const tasksByDay = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (t.due_date) {
        (map[t.due_date] = map[t.due_date] || []).push(t);
      }
    });
    return map;
  }, [tasks]);

  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1));

  const openCreate = (dateISO) => {
    setEditing(null);
    setPresetDate(dateISO);
    setModalOpen(true);
  };

  // When opening modal with a preset date, we override the empty form by passing a "task-like" prefill via the editing prop is wrong.
  // Simpler: pass a fake task with only due_date to TaskModal? It would treat it as edit. So pass null and use an effect.
  // We use a key trick: re-mount modal with a stub.
  const stubTask = presetDate ? { id: null, due_date: presetDate, start_date: presetDate } : null;

  const todayISO = fmt(today);

  return (
    <Layout>
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="label-mono text-[#FF5E00]">// CALENDAR / MONTHLY</p>
          <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter mt-2">
            {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}.
          </h1>
          <p className="text-[#A1A4AB] mt-2">Vue mensuelle des échéances.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={goPrev}
            data-testid="calendar-prev"
            variant="outline"
            className="border-white/10 text-white hover:bg-white/5 rounded-sm h-11 w-11 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={goToday}
            data-testid="calendar-today"
            variant="outline"
            className="border-white/10 text-white hover:bg-white/5 rounded-sm h-11"
          >
            Aujourd'hui
          </Button>
          <Button
            onClick={goNext}
            data-testid="calendar-next"
            variant="outline"
            className="border-white/10 text-white hover:bg-white/5 rounded-sm h-11 w-11 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => openCreate(todayISO)}
            data-testid="create-task-btn-calendar"
            className="bg-[#FF5E00] hover:bg-[#FF7A33] text-[#0A0A0B] rounded-sm font-semibold h-11 ml-2"
          >
            <Plus className="w-4 h-4 mr-2" /> Nouvelle tâche
          </Button>
        </div>
      </div>

      <div className="surface rounded-sm overflow-hidden" data-testid="calendar-grid">
        <div className="grid grid-cols-7 border-b border-white/10">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="label-mono p-3 text-center border-r border-white/5 last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-6">
          {grid.flat().map((d, i) => {
            const iso = fmt(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = iso === todayISO;
            const dayTasks = tasksByDay[iso] || [];
            return (
              <div
                key={i}
                data-testid={`calendar-day-${iso}`}
                className={`min-h-[110px] border-r border-b border-white/5 p-2 transition-colors ${inMonth ? "" : "opacity-40"} hover:bg-white/[0.03]`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-mono text-xs ${isToday ? "bg-[#FF5E00] text-[#0A0A0B] px-1.5 py-0.5 rounded-sm" : "text-[#A1A4AB]"}`}
                  >
                    {d.getDate()}
                  </span>
                  <button
                    onClick={() => openCreate(iso)}
                    className="opacity-0 hover:opacity-100 text-[#A1A4AB] hover:text-white"
                    aria-label="Add task this day"
                    data-testid={`calendar-add-${iso}`}
                    style={{ opacity: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setEditing(t); setPresetDate(null); setModalOpen(true); }}
                      data-testid={`calendar-task-${t.id}`}
                      className="w-full text-left text-[11px] truncate accent-border-l rounded-sm bg-[#0A0A0B] px-2 py-1 hover:bg-[#1D1E24]"
                      style={{ borderLeftColor: STATUS_COLORS[t.status] }}
                      title={t.title}
                    >
                      {t.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="label-mono text-[9px]">+{dayTasks.length - 3}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-6 label-mono">
        {Object.entries(STATUS_COLORS).map(([k, c]) => (
          <span key={k} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
            {k}
          </span>
        ))}
      </div>

      <TaskModal
        key={presetDate || editing?.id || "new"}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setPresetDate(null); }}
        task={editing}
        initialDate={presetDate}
        allTasks={tasks}
        onSaved={() => { setPresetDate(null); load(); }}
        onDeleted={() => { setPresetDate(null); load(); }}
      />
    </Layout>
  );
}
