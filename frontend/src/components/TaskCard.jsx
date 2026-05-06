import React from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, GitBranch } from "lucide-react";

const STATUS_COLORS = {
  todo: "#A1A4AB",
  in_progress: "#00E5FF",
  blocked: "#FF3366",
  done: "#00F298",
};

const PRIORITY_COLORS = {
  low: "#A1A4AB",
  medium: "#FFC400",
  high: "#FF3366",
};

const PRIORITY_LABELS = { low: "Basse", medium: "Moyenne", high: "Haute" };

export default function TaskCard({ task, onClick, dragging, childCount = 0 }) {
  const statusColor = STATUS_COLORS[task.status] || "#A1A4AB";
  const priorityColor = PRIORITY_COLORS[task.priority] || "#A1A4AB";

  const overdue = task.due_date && task.status !== "done" && task.due_date < new Date().toISOString().slice(0,10);

  return (
    <div
      onClick={onClick}
      data-testid={`task-card-${task.id}`}
      className={`group cursor-pointer surface rounded-sm p-4 transition-all duration-200 hover:-translate-y-0.5 surface-hover accent-border-l ${dragging ? "dragging" : ""}`}
      style={{ borderLeftColor: statusColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-heading font-semibold text-sm leading-snug text-white">
          {task.title}
        </h4>
        <span
          className="shrink-0 w-2 h-2 rounded-full mt-1.5"
          style={{ backgroundColor: priorityColor }}
          title={`Priorité: ${PRIORITY_LABELS[task.priority]}`}
        />
      </div>
      {task.description && (
        <p className="text-xs text-[#A1A4AB] mt-2 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {(task.tags?.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {task.tags.slice(0,3).map((t) => (
            <Badge key={t} className="bg-white/5 border border-white/10 text-[#A1A4AB] rounded-sm font-mono text-[9px] uppercase tracking-wider px-1.5 py-0">
              {t}
            </Badge>
          ))}
          {task.tags.length > 3 && (
            <span className="label-mono text-[9px]">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-3 text-[11px] font-mono text-[#A1A4AB]">
          {task.due_date && (
            <span className={`flex items-center gap-1 ${overdue ? "text-[#FF3366]" : ""}`}>
              <CalendarClock className="w-3 h-3" />
              {task.due_date}
            </span>
          )}
          {childCount > 0 && (
            <span className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" /> {childCount}
            </span>
          )}
        </div>
        {task.story_points != null && (
          <span
            className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-[#FF5E00]/10 border border-[#FF5E00]/30 text-[#FF5E00]"
            data-testid={`task-sp-${task.id}`}
            title={`${task.story_points} story points`}
          >
            {task.story_points} SP
          </span>
        )}
      </div>
    </div>
  );
}
