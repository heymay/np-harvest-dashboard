"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  Clock,
  Users,
  Briefcase,
  BarChart2,
  Settings,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface Creds {
  token: string;
  accountId: string;
}

interface TimeEntry {
  id: number;
  spent_date: string;
  hours: number;
  notes: string;
  user: { name: string };
  project: { name: string };
  task: { name: string };
  client: { name: string };
}

interface Project {
  id: number;
  name: string;
  client: { name: string };
  is_active: boolean;
  budget: number | null;
  budget_spent: number | null;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  roles: string[];
}

type QueryTab = "time" | "projects" | "team" | "summary";

function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function CredentialsBanner({
  creds,
  setCreds,
}: {
  creds: Creds;
  setCreds: (c: Creds) => void;
}) {
  const [open, setOpen] = useState(!creds.token);
  const [draft, setDraft] = useState(creds);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">
            Harvest Credentials
          </span>
          {creds.token && creds.accountId && (
            <CheckCircle2 size={14} className="text-green-500" />
          )}
        </div>
        {open ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs text-gray-500">
            Get your token from{" "}
            <strong>harvestapp.com → Settings → Developers</strong>. Your
            Account ID is shown on the same page.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Personal Access Token
              </label>
              <input
                type="password"
                value={draft.token}
                onChange={(e) => setDraft({ ...draft, token: e.target.value })}
                placeholder="your_harvest_token"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Account ID
              </label>
              <input
                type="text"
                value={draft.accountId}
                onChange={(e) =>
                  setDraft({ ...draft, accountId: e.target.value })
                }
                placeholder="1234567"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
          <button
            onClick={() => {
              setCreds(draft);
              setOpen(false);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Save Credentials
          </button>
        </div>
      )}
    </div>
  );
}

export default function HarvestDashboard() {
  const [creds, setCreds] = useState<Creds>({ token: "", accountId: "" });
  const [activeTab, setActiveTab] = useState<QueryTab>("time");

  // Time entries state
  const [dateFrom, setDateFrom] = useState(
    () => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);

  // Team state
  const [team, setTeam] = useState<User[]>([]);

  // Summary state
  const [summaryDate, setSummaryDate] = useState(
    () => new Date().toISOString().slice(0, 7)
  );
  const [summaryData, setSummaryData] = useState<
    { name: string; hours: number }[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headers = {
    "x-harvest-token": creds.token,
    "x-harvest-account-id": creds.accountId,
  };

  const apiFetch = useCallback(
    async (endpoint: string, params: Record<string, string> = {}) => {
      if (!creds.token || !creds.accountId) {
        setError("Please enter your Harvest credentials first.");
        return null;
      }
      setError("");
      setLoading(true);
      try {
        const qs = new URLSearchParams({ endpoint, ...params }).toString();
        const res = await fetch(`/api/harvest?${qs}`, { headers });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error_description || data.message || "API error");
        return data;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [creds] // eslint-disable-line react-hooks/exhaustive-deps
  );

  async function fetchTimeEntries() {
    const data = await apiFetch("/time_entries", {
      from: dateFrom,
      to: dateTo,
      per_page: "100",
    });
    if (data) setTimeEntries(data.time_entries || []);
  }

  async function fetchProjects() {
    const data = await apiFetch("/projects", { per_page: "100" });
    if (data) setProjects(data.projects || []);
  }

  async function fetchTeam() {
    const data = await apiFetch("/users", { per_page: "100" });
    if (data) setTeam(data.users || []);
  }

  async function fetchSummary() {
    const [year, month] = summaryDate.split("-");
    const from = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const to = `${year}-${month}-${lastDay}`;
    const data = await apiFetch("/time_entries", {
      from,
      to,
      per_page: "500",
    });
    if (!data) return;
    const map: Record<string, number> = {};
    for (const e of data.time_entries as TimeEntry[]) {
      const key = e.user?.name || "Unknown";
      map[key] = (map[key] || 0) + e.hours;
    }
    setSummaryData(
      Object.entries(map)
        .map(([name, hours]) => ({ name, hours }))
        .sort((a, b) => b.hours - a.hours)
    );
  }

  const totalHours = timeEntries.reduce((s, e) => s + e.hours, 0);

  const tabs: { id: QueryTab; label: string; icon: React.ReactNode }[] = [
    { id: "time", label: "Time Entries", icon: <Clock size={15} /> },
    { id: "projects", label: "Projects", icon: <Briefcase size={15} /> },
    { id: "team", label: "Team", icon: <Users size={15} /> },
    { id: "summary", label: "Monthly Summary", icon: <BarChart2 size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Image src="/logo.png" alt="National Positions" width={180} height={44} priority />
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock size={14} className="text-orange-500" />
          Harvest Time Dashboard
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <CredentialsBanner creds={creds} setCreds={setCreds} />

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Time Entries Tab */}
        {activeTab === "time" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Query Time Entries
              </h2>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <button
                  onClick={fetchTimeEntries}
                  disabled={loading}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Fetch Entries
                </button>
              </div>
            </div>

            {timeEntries.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    {timeEntries.length} entries
                  </span>
                  <span className="text-sm font-bold text-orange-600">
                    {totalHours.toFixed(2)} hrs total
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <tr>
                        {["Date", "Person", "Client", "Project", "Task", "Hours", "Notes"].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left font-medium"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {timeEntries.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                            {e.spent_date}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium">
                            {e.user?.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {e.client?.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {e.project?.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {e.task?.name}
                          </td>
                          <td className="px-4 py-3 font-semibold text-orange-600 whitespace-nowrap">
                            {e.hours.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                            {e.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  All Projects
                </h2>
                <button
                  onClick={fetchProjects}
                  disabled={loading}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Load Projects
                </button>
              </div>
            </div>

            {projects.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                        {p.name}
                      </h3>
                      <Badge active={p.is_active} />
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {p.client?.name}
                    </p>
                    {p.budget != null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Budget used</span>
                          <span>
                            {p.budget_spent?.toFixed(1)} / {p.budget?.toFixed(1)} hrs
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-orange-500 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                ((p.budget_spent || 0) / p.budget) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  Team Members
                </h2>
                <button
                  onClick={fetchTeam}
                  disabled={loading}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Load Team
                </button>
              </div>
            </div>

            {team.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      {["Name", "Email", "Roles", "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {team.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">
                          {u.first_name} {u.last_name}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u.email}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {u.roles?.join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge active={u.is_active} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Monthly Hours by Person
              </h2>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Month
                  </label>
                  <input
                    type="month"
                    value={summaryDate}
                    onChange={(e) => setSummaryDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <button
                  onClick={fetchSummary}
                  disabled={loading}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Generate Summary
                </button>
              </div>
            </div>

            {summaryData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  Total:{" "}
                  {summaryData.reduce((s, r) => s + r.hours, 0).toFixed(2)} hrs
                </p>
                {summaryData.map((row) => {
                  const max = summaryData[0].hours;
                  return (
                    <div key={row.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800">
                          {row.name}
                        </span>
                        <span className="text-orange-600 font-semibold">
                          {row.hours.toFixed(2)} hrs
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{ width: `${(row.hours / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
