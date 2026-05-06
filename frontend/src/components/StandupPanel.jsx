import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Mic, FileText, AlertOctagon, ListChecks } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const todayISO = () => new Date().toISOString().slice(0, 10);
const yesterdayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

function buildMarkdown({ yesterdayDate, todayDate, yesterday, today, blockers }) {
  const fmtList = (items) =>
    items.length === 0 ? "_aucune_" :
    items.map((t) => `- **${t.title}**${t.priority === "high" ? " ⚠️" : ""}${t.tags?.length ? ` _(${t.tags.join(", ")})_` : ""}`).join("\n");
  return [
    `### 🗓️ Daily Standup — ${todayDate}`,
    "",
    `**Hier (${yesterdayDate})**`,
    fmtList(yesterday),
    "",
    `**Aujourd'hui (${todayDate})**`,
    fmtList(today),
    "",
    `**Blocages**`,
    fmtList(blockers),
  ].join("\n");
}

function buildPlainText({ yesterdayDate, todayDate, yesterday, today, blockers }) {
  const fmtList = (items) =>
    items.length === 0 ? "  (aucune)" :
    items.map((t) => `  • ${t.title}${t.priority === "high" ? " [!]" : ""}`).join("\n");
  return [
    `Daily Standup — ${todayDate}`,
    "",
    `Hier (${yesterdayDate}):`,
    fmtList(yesterday),
    "",
    `Aujourd'hui (${todayDate}):`,
    fmtList(today),
    "",
    `Blocages:`,
    fmtList(blockers),
  ].join("\n");
}

const STATUS_DOT = {
  todo: "#A1A4AB", in_progress: "#00E5FF", blocked: "#FF3366", done: "#00F298",
};

function Section({ title, slug, count, color, icon: Icon, items, empty }) {
  return (
    <div className="surface rounded-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <p className="label-mono" style={{ color }}>// {title}</p>
        </div>
        <span className="font-heading font-bold text-2xl" style={{ color }}>{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[#A1A4AB]" data-testid={`standup-empty-${slug}`}>{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li
              key={t.id}
              className="flex items-start gap-3 p-3 rounded-sm bg-[#0A0A0B] border border-white/5"
              data-testid={`standup-item-${t.id}`}
            >
              <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: STATUS_DOT[t.status] }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{t.title}</p>
                {t.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {t.tags.map((tg) => (
                      <span key={tg} className="label-mono text-[9px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-sm">
                        {tg}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {t.priority === "high" && (
                <span className="label-mono text-[9px] text-[#FF3366]">HIGH</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StandupPanel({ open, onOpenChange }) {
  const [tasks, setTasks] = useState([]);
  const [yesterdayDate, setYesterdayDate] = useState(yesterdayISO());
  const [todayDate, setTodayDate] = useState(todayISO());
  const [copied, setCopied] = useState(null);

  const load = useCallback(async () => {
    const res = await api.get("/tasks", { params: { archived: false } });
    setTasks(res.data);
  }, []);

  useEffect(() => {
    if (open) {
      setYesterdayDate(yesterdayISO());
      setTodayDate(todayISO());
      load();
    }
  }, [open, load]);

  const { yesterday, today, blockers } = useMemo(() => {
    const yest = tasks.filter((t) => t.status === "done" && t.actual_end_date === yesterdayDate);
    const td = tasks.filter((t) => {
      if (t.status === "done") return false;
      if (t.status === "in_progress") return true;
      if (t.start_date && t.due_date && t.start_date <= todayDate && t.due_date >= todayDate) return true;
      if (t.due_date === todayDate || t.start_date === todayDate) return true;
      return false;
    });
    const bl = tasks.filter((t) => t.status === "blocked");
    return { yesterday: yest, today: td, blockers: bl };
  }, [tasks, yesterdayDate, todayDate]);

  const copy = async (kind) => {
    const data = { yesterdayDate, todayDate, yesterday, today, blockers };
    const text = kind === "markdown" ? buildMarkdown(data) : buildPlainText(data);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast.success(kind === "markdown" ? "Markdown copié" : "Texte copié");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-[#0A0A0B] border-l border-white/10 text-white sm:max-w-2xl overflow-y-auto"
        data-testid="standup-panel"
      >
        <SheetHeader className="text-left">
          <p className="label-mono text-[#FF5E00]">// DAILY STANDUP</p>
          <SheetTitle className="font-heading font-black tracking-tighter text-3xl text-white">
            Récap de la cérémonie.
          </SheetTitle>
          <SheetDescription className="text-sm text-[#A1A4AB]">
            Auto-généré depuis vos tâches. Ajustez la date "Hier" si besoin.
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <Label className="label-mono">Date "Hier"</Label>
            <Input
              type="date"
              value={yesterdayDate}
              onChange={(e) => setYesterdayDate(e.target.value)}
              data-testid="standup-yesterday-date"
              className="bg-[#131418] border-white/10 text-white mt-2 rounded-sm"
            />
          </div>
          <div>
            <Label className="label-mono">Date "Aujourd'hui"</Label>
            <Input
              type="date"
              value={todayDate}
              onChange={(e) => setTodayDate(e.target.value)}
              data-testid="standup-today-date"
              className="bg-[#131418] border-white/10 text-white mt-2 rounded-sm"
            />
          </div>
        </div>

        <div className="space-y-4 mt-6">
          <Section
            title="HIER"
            slug="hier"
            color="#00F298"
            icon={ListChecks}
            count={yesterday.length}
            items={yesterday}
            empty="Pas de tâche terminée à cette date."
          />
          <Section
            title="AUJOURD'HUI"
            slug="aujourdhui"
            color="#00E5FF"
            icon={Mic}
            count={today.length}
            items={today}
            empty="Aucune tâche en cours ou prévue aujourd'hui."
          />
          <Section
            title="BLOCAGES"
            slug="blocages"
            color="#FF3366"
            icon={AlertOctagon}
            count={blockers.length}
            items={blockers}
            empty="Aucun blocage. ⚡"
          />
        </div>

        <div className="sticky bottom-0 -mx-6 px-6 py-4 mt-8 bg-[#0A0A0B]/95 backdrop-blur-xl border-t border-white/10 flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => copy("markdown")}
            data-testid="copy-markdown-btn"
            className="bg-[#FF5E00] hover:bg-[#FF7A33] text-[#0A0A0B] rounded-sm font-semibold flex-1 h-11"
          >
            {copied === "markdown" ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            Copier Markdown (Slack/Teams)
          </Button>
          <Button
            onClick={() => copy("text")}
            data-testid="copy-text-btn"
            variant="outline"
            className="border-white/10 text-white hover:bg-white/5 rounded-sm flex-1 h-11"
          >
            {copied === "text" ? <Check className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            Copier en texte brut
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
