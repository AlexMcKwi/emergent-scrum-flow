import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Layout from "@/components/Layout";
import TaskCard from "@/components/TaskCard";
import TaskModal from "@/components/TaskModal";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const COLUMNS = [
  { id: "todo", label: "À faire", accent: "#A1A4AB" },
  { id: "in_progress", label: "En cours", accent: "#00E5FF" },
  { id: "blocked", label: "Bloqué", accent: "#FF3366" },
  { id: "done", label: "Terminé", accent: "#00F298" },
];

function SortableCard({ task, onClick, childCount }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} childCount={childCount} onClick={onClick} />
    </div>
  );
}

function Column({ col, tasks, onCardClick, childCount }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-col-${col.id}`}
      className={`surface rounded-sm p-4 flex flex-col min-h-[70vh] transition-colors ${isOver ? "border-white/25 bg-[#1D1E24]" : ""}`}
      style={{ borderTop: `2px solid ${col.accent}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label-mono" style={{ color: col.accent }}>// {col.label}</p>
          <h3 className="font-heading font-bold text-lg tracking-tight">{tasks.length}</h3>
        </div>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 flex-1">
          {tasks.map((t) => (
            <SortableCard key={t.id} task={t} childCount={childCount(t.id)} onClick={() => onCardClick(t)} />
          ))}
          {tasks.length === 0 && (
            <div className="text-xs text-[#565961] font-mono border border-dashed border-white/10 rounded-sm p-6 text-center">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function Kanban() {
  const [tasks, setTasks] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = async () => {
    const res = await api.get("/tasks", { params: { archived: false } });
    setTasks(res.data);
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const g = { todo: [], in_progress: [], blocked: [], done: [] };
    tasks.forEach((t) => { (g[t.status] || g.todo).push(t); });
    return g;
  }, [tasks]);

  const childCount = (id) => tasks.filter((t) => t.parent_id === id).length;

  const handleDragStart = (e) => setActiveId(e.active.id);
  const handleDragEnd = async (e) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    // Determine target column: "over" can be a column id OR a card id
    let targetStatus = null;
    if (COLUMNS.find((c) => c.id === over.id)) {
      targetStatus = over.id;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) targetStatus = overTask.status;
    }
    if (!targetStatus || targetStatus === task.status) return;

    // Optimistic
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: targetStatus } : t));
    try {
      await api.put(`/tasks/${task.id}`, { status: targetStatus });
      load();
    } catch {
      toast.error("Impossible de déplacer la tâche");
      load();
    }
  };

  const activeTask = tasks.find((t) => t.id === activeId);

  return (
    <Layout>
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="label-mono text-[#FF5E00]">// KANBAN / FLOW</p>
          <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter mt-2">
            Flow board.
          </h1>
          <p className="text-[#A1A4AB] mt-2">Glissez les tâches pour changer leur statut.</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          data-testid="create-task-btn-kanban"
          className="bg-[#FF5E00] hover:bg-[#FF7A33] text-[#0A0A0B] rounded-sm font-semibold h-11"
        >
          <Plus className="w-4 h-4 mr-2" /> Nouvelle tâche
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              col={col}
              tasks={grouped[col.id]}
              onCardClick={(t) => { setEditing(t); setModalOpen(true); }}
              childCount={childCount}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} dragging childCount={childCount(activeTask.id)} /> : null}
        </DragOverlay>
      </DndContext>

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
