import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

const PRIORITIES = [
  { value: "all", label: "Toutes priorités" },
  { value: "low", label: "Basse" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
];

export default function FilterBar({
  search, onSearch,
  priority, onPriority,
  tag, onTag,
  availableTags = [],
  trailing = null,
}) {
  return (
    <div
      className="surface rounded-sm p-4 mb-6 flex flex-col md:flex-row md:items-center gap-3"
      data-testid="filter-bar"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#565961]" />
        <Input
          data-testid="filter-search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Rechercher par titre, description ou tag…"
          className="pl-9 bg-[#0A0A0B] border-white/10 text-white rounded-sm h-10"
        />
        {search && (
          <button
            onClick={() => onSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#565961] hover:text-white"
            aria-label="clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Select value={priority} onValueChange={onPriority}>
        <SelectTrigger
          data-testid="filter-priority"
          className="bg-[#0A0A0B] border-white/10 text-white rounded-sm h-10 w-full md:w-48"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#131418] border-white/10 text-white">
          {PRIORITIES.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={tag} onValueChange={onTag}>
        <SelectTrigger
          data-testid="filter-tag"
          className="bg-[#0A0A0B] border-white/10 text-white rounded-sm h-10 w-full md:w-56"
        >
          <SelectValue placeholder="Tous tags" />
        </SelectTrigger>
        <SelectContent className="bg-[#131418] border-white/10 text-white max-h-60">
          <SelectItem value="all">Tous les tags</SelectItem>
          {availableTags.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(search || priority !== "all" || tag !== "all") && (
        <Badge
          onClick={() => { onSearch(""); onPriority("all"); onTag("all"); }}
          data-testid="filter-reset"
          className="cursor-pointer bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-sm font-mono text-[10px] uppercase tracking-wider h-10 px-3 flex items-center"
        >
          <X className="w-3 h-3 mr-1" /> Reset
        </Badge>
      )}

      {trailing}
    </div>
  );
}

export function filterTasks(tasks, { search, priority, tag }) {
  const q = (search || "").trim().toLowerCase();
  return tasks.filter((t) => {
    if (priority && priority !== "all" && t.priority !== priority) return false;
    if (tag && tag !== "all" && !(t.tags || []).includes(tag)) return false;
    if (q) {
      const hay = [
        t.title, t.description, ...(t.tags || []),
      ].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function collectTags(tasks) {
  const set = new Set();
  tasks.forEach((t) => (t.tags || []).forEach((x) => set.add(x)));
  return Array.from(set).sort();
}
