import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Archive, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const STATUSES = [
  { value: "todo", label: "À faire" },
  { value: "in_progress", label: "En cours" },
  { value: "blocked", label: "Bloqué" },
  { value: "done", label: "Terminé" },
];
const PRIORITIES = [
  { value: "low", label: "Basse" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
];

const empty = {
  title: "", description: "",
  start_date: "", due_date: "", actual_end_date: "",
  priority: "medium", status: "todo",
  tags: [], parent_id: null,
};

export default function TaskModal({ open, onClose, task, allTasks, onSaved, onDeleted }) {
  const [form, setForm] = useState(empty);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        start_date: task.start_date || "",
        due_date: task.due_date || "",
        actual_end_date: task.actual_end_date || "",
        priority: task.priority || "medium",
        status: task.status || "todo",
        tags: task.tags || [],
        parent_id: task.parent_id || null,
      });
    } else {
      setForm(empty);
    }
    setTagInput("");
  }, [task, open]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (!form.tags.includes(v)) update("tags", [...form.tags, v]);
    setTagInput("");
  };

  const removeTag = (t) => update("tags", form.tags.filter((x) => x !== t));

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        actual_end_date: form.actual_end_date || null,
        parent_id: form.parent_id || null,
      };
      if (task) {
        const res = await api.put(`/tasks/${task.id}`, payload);
        toast.success("Tâche mise à jour");
        onSaved(res.data);
      } else {
        const res = await api.post("/tasks", payload);
        toast.success("Tâche créée");
        onSaved(res.data);
      }
      onClose();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!task) return;
    try {
      await api.post(`/tasks/${task.id}/archive`);
      toast.success("Tâche archivée");
      onDeleted?.(task.id);
      onClose();
    } catch { toast.error("Erreur d'archivage"); }
  };

  const del = async () => {
    if (!task) return;
    if (!window.confirm("Supprimer définitivement cette tâche ?")) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      toast.success("Tâche supprimée");
      onDeleted?.(task.id);
      onClose();
    } catch { toast.error("Erreur de suppression"); }
  };

  const parentOptions = (allTasks || []).filter((t) => !task || t.id !== task.id);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-[#131418] border border-white/10 text-white max-w-2xl"
        data-testid="task-modal"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            {task ? "Modifier la tâche" : "Nouvelle tâche"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5 mt-2">
          <div>
            <Label className="label-mono">Titre</Label>
            <Input
              data-testid="task-title-input"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Ex. Refonte du backlog sprint 42"
              className="bg-[#0A0A0B] border-white/10 text-white mt-2 rounded-sm"
            />
          </div>
          <div>
            <Label className="label-mono">Description</Label>
            <Textarea
              data-testid="task-description-input"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={4}
              placeholder="Contexte, critères d'acceptation, liens Jira…"
              className="bg-[#0A0A0B] border-white/10 text-white mt-2 rounded-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="label-mono">Début</Label>
              <Input
                type="date"
                data-testid="task-start-date"
                value={form.start_date || ""}
                onChange={(e) => update("start_date", e.target.value)}
                className="bg-[#0A0A0B] border-white/10 text-white mt-2 rounded-sm"
              />
            </div>
            <div>
              <Label className="label-mono">Échéance</Label>
              <Input
                type="date"
                data-testid="task-due-date"
                value={form.due_date || ""}
                onChange={(e) => update("due_date", e.target.value)}
                className="bg-[#0A0A0B] border-white/10 text-white mt-2 rounded-sm"
              />
            </div>
            <div>
              <Label className="label-mono">Fin réelle</Label>
              <Input
                type="date"
                data-testid="task-actual-end-date"
                value={form.actual_end_date || ""}
                onChange={(e) => update("actual_end_date", e.target.value)}
                className="bg-[#0A0A0B] border-white/10 text-white mt-2 rounded-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="label-mono">Statut</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger
                  data-testid="task-status-select"
                  className="bg-[#0A0A0B] border-white/10 text-white mt-2 rounded-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#131418] border-white/10 text-white">
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="label-mono">Priorité</Label>
              <Select value={form.priority} onValueChange={(v) => update("priority", v)}>
                <SelectTrigger
                  data-testid="task-priority-select"
                  className="bg-[#0A0A0B] border-white/10 text-white mt-2 rounded-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#131418] border-white/10 text-white">
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="label-mono">Tâche parent</Label>
            <Select
              value={form.parent_id || "none"}
              onValueChange={(v) => update("parent_id", v === "none" ? null : v)}
            >
              <SelectTrigger
                data-testid="task-parent-select"
                className="bg-[#0A0A0B] border-white/10 text-white mt-2 rounded-sm"
              >
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent className="bg-[#131418] border-white/10 text-white max-h-60">
                <SelectItem value="none">— Aucune —</SelectItem>
                {parentOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="label-mono">Tags</Label>
            <div className="flex gap-2 mt-2">
              <Input
                data-testid="task-tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Sprint-42, bug, cérémonie…"
                className="bg-[#0A0A0B] border-white/10 text-white rounded-sm"
              />
              <Button type="button" onClick={addTag} variant="outline"
                className="border-white/10 text-white hover:bg-white/5 rounded-sm">
                Ajouter
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {form.tags.map((t) => (
                <Badge key={t} className="bg-white/5 border border-white/10 text-white rounded-sm font-mono text-[10px] uppercase tracking-wider">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="ml-2 opacity-60 hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-5 border-t border-white/10">
            <div className="flex gap-2">
              {task && (
                <>
                  <Button type="button" variant="outline" onClick={archive}
                    data-testid="task-archive-btn"
                    className="border-white/10 text-[#FFC400] hover:bg-white/5 rounded-sm">
                    <Archive className="w-4 h-4 mr-2" /> Archiver
                  </Button>
                  <Button type="button" variant="outline" onClick={del}
                    data-testid="task-delete-btn"
                    className="border-white/10 text-[#FF3366] hover:bg-white/5 rounded-sm">
                    <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}
                className="border-white/10 text-white hover:bg-white/5 rounded-sm">
                Annuler
              </Button>
              <Button type="submit" disabled={saving} data-testid="task-save-btn"
                className="bg-[#FF5E00] hover:bg-[#FF7A33] text-[#0A0A0B] rounded-sm font-semibold">
                {saving ? "…" : task ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
