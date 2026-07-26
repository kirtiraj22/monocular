import { CheckCircle2, XCircle, Clock } from "lucide-react";

export function normalizeStatus(status: string): "success" | "failed" | "pending" {
  const s = status.toLowerCase();
  if (s === "success" || s === "completed") return "success";
  if (s === "failed" || s === "failure") return "failed";
  return "pending";
}

export default function StatusBadge({ status }: { status: string }) {
  const kind = normalizeStatus(status);

  const styles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    failed: "bg-rose-50 text-rose-700 border-rose-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
  }[kind];

  const label = {
    success: "Success",
    failed: "Failed",
    pending: status,
  }[kind];

  const Icon = { success: CheckCircle2, failed: XCircle, pending: Clock }[kind];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${styles}`}
    >
      <Icon className={`w-3 h-3 ${kind === "pending" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}
