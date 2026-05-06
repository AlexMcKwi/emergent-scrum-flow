export function tasksToCSV(tasks) {
  const headers = [
    "id", "title", "description", "status", "priority",
    "start_date", "due_date", "actual_end_date",
    "tags", "parent_id", "archived", "created_at", "updated_at",
  ];
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join("|") : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  tasks.forEach((t) => {
    lines.push(headers.map((h) => esc(t[h])).join(","));
  });
  return lines.join("\n");
}

export function downloadCSV(filename, csv) {
  // Prepend UTF-8 BOM so Excel opens accented characters correctly.
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
