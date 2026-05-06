import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import TaskCard from "@/components/TaskCard";
import TaskModal from "@/components/TaskModal";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

export default function ArchivePage() {
  const [tasks, setTasks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    const res = await api.get("/tasks", { params: { archived: true } });
    setTasks(res.data);
  };
  useEffect(() => { load(); }, []);

  const unarchive = async (id) => {
    try {
      await api.post(`/tasks/${id}/unarchive`);
      toast.success("Tâche restaurée");
      load();
    } catch { toast.error("Erreur"); }
  };

  return (
    <Layout>
      <div className="mb-10">
        <p className="label-mono text-[#FF5E00]">// ARCHIVES / HISTORY</p>
        <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter mt-2">Historique.</h1>
        <p className="text-[#A1A4AB] mt-2">Les tâches archivées sont conservées et consultables ici.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="archive-grid">
        {tasks.length === 0 && (
          <p className="text-sm text-[#A1A4AB] col-span-full">Aucune tâche archivée.</p>
        )}
        {tasks.map((t) => (
          <div key={t.id} className="relative">
            <TaskCard task={t} onClick={() => { setEditing(t); setModalOpen(true); }} />
            <Button
              onClick={(e) => { e.stopPropagation(); unarchive(t.id); }}
              data-testid={`unarchive-${t.id}`}
              size="sm"
              variant="outline"
              className="absolute top-3 right-3 h-7 px-2 border-white/10 text-[#00F298] hover:bg-white/5 rounded-sm"
            >
              <ArchiveRestore className="w-3 h-3 mr-1" /> Restaurer
            </Button>
          </div>
        ))}
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
