import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import TaskCard from "@/components/TaskCard";
import TaskModal from "@/components/TaskModal";
import FilterBar, { filterTasks, collectTags } from "@/components/FilterBar";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArchiveRestore, Download } from "lucide-react";
import { toast } from "sonner";
import { tasksToCSV, downloadCSV } from "@/lib/csv";

export default function ArchivePage() {
  const [tasks, setTasks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [tag, setTag] = useState("all");

  const load = async () => {
    const res = await api.get("/tasks", { params: { archived: true } });
    setTasks(res.data);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => filterTasks(tasks, { search, priority, tag }),
    [tasks, search, priority, tag]
  );

  const unarchive = async (id) => {
    try {
      await api.post(`/tasks/${id}/unarchive`);
      toast.success("Tâche restaurée");
      load();
    } catch { toast.error("Erreur"); }
  };

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error("Aucune tâche à exporter");
      return;
    }
    const csv = tasksToCSV(filtered);
    const ts = new Date().toISOString().slice(0, 10);
    downloadCSV(`scrumflow-archive-${ts}.csv`, csv);
    toast.success(`${filtered.length} tâche(s) exportée(s)`);
  };

  return (
    <Layout>
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="label-mono text-[#FF5E00]">// ARCHIVES / HISTORY</p>
          <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter mt-2">Historique.</h1>
          <p className="text-[#A1A4AB] mt-2">Les tâches archivées sont conservées et consultables ici.</p>
        </div>
        <Button
          onClick={exportCSV}
          data-testid="export-csv-btn"
          variant="outline"
          className="border-white/10 text-white hover:bg-white/5 rounded-sm h-11"
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <FilterBar
        search={search} onSearch={setSearch}
        priority={priority} onPriority={setPriority}
        tag={tag} onTag={setTag}
        availableTags={collectTags(tasks)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="archive-grid">
        {filtered.length === 0 && (
          <p className="text-sm text-[#A1A4AB] col-span-full">Aucune tâche archivée.</p>
        )}
        {filtered.map((t) => (
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
