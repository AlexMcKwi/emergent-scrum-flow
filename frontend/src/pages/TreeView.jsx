import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import TaskModal from "@/components/TaskModal";
import { api } from "@/lib/api";
import { ChevronRight, ChevronDown, Plus, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_COLORS = { todo: "#A1A4AB", in_progress: "#00E5FF", blocked: "#FF3366", done: "#00F298" };

function Node({ task, children, depth, onClick, expanded, onToggle }) {
  return (
    <div>
      <div
        className="group flex items-center gap-2 py-2 pr-3 rounded-sm hover:bg-white/5 cursor-pointer"
        style={{ paddingLeft: 8 + depth * 20 }}
        onClick={onClick}
        data-testid={`tree-node-${task.id}`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="w-5 h-5 flex items-center justify-center text-[#A1A4AB] hover:text-white"
        >
          {children.length > 0 ? (expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : <CircleDot className="w-3 h-3 opacity-40" />}
        </button>
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: STATUS_COLORS[task.status] }}
        />
        <span className="text-sm font-medium truncate flex-1">{task.title}</span>
        {task.due_date && (
          <span className="label-mono text-[10px] shrink-0">{task.due_date}</span>
        )}
        <span className="label-mono text-[10px] text-[#565961] shrink-0">{task.priority}</span>
      </div>
      {expanded && children.length > 0 && (
        <div className="border-l border-white/10 ml-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function TreeView() {
  const [tasks, setTasks] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const res = await api.get("/tasks", { params: { archived: false } });
    setTasks(res.data);
    // Expand all by default first load
    setExpanded((prev) => {
      if (Object.keys(prev).length) return prev;
      const out = {};
      res.data.forEach((t) => { out[t.id] = true; });
      return out;
    });
  };
  useEffect(() => { load(); }, []);

  const { roots, childrenMap } = useMemo(() => {
    const cm = {};
    tasks.forEach((t) => {
      const p = t.parent_id || "__root__";
      (cm[p] = cm[p] || []).push(t);
    });
    return { roots: cm["__root__"] || [], childrenMap: cm };
  }, [tasks]);

  const renderNode = (task, depth) => {
    const children = childrenMap[task.id] || [];
    return (
      <Node
        key={task.id}
        task={task}
        depth={depth}
        expanded={!!expanded[task.id]}
        onToggle={() => setExpanded((e) => ({ ...e, [task.id]: !e[task.id] }))}
        onClick={() => { setEditing(task); setModalOpen(true); }}
        children={children.map((c) => renderNode(c, depth + 1))}
      />
    );
  };

  return (
    <Layout>
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="label-mono text-[#FF5E00]">// TREE / HIERARCHY</p>
          <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter mt-2">Hiérarchie parent / enfant.</h1>
          <p className="text-[#A1A4AB] mt-2">Explorez les dépendances entre vos tâches.</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          data-testid="create-task-btn-tree"
          className="bg-[#FF5E00] hover:bg-[#FF7A33] text-[#0A0A0B] rounded-sm font-semibold h-11"
        >
          <Plus className="w-4 h-4 mr-2" /> Nouvelle tâche
        </Button>
      </div>

      <div className="surface rounded-sm p-4" data-testid="tree-container">
        {roots.length === 0 && (
          <p className="text-sm text-[#A1A4AB] p-6">Aucune tâche. Créez la première.</p>
        )}
        {roots.map((r) => renderNode(r, 0))}
      </div>

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
