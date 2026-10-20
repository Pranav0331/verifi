"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface CreatedAppCredentials {
  appId: Id<"verifierApps">;
  name: string;
  clientId: string;
  apiKey: string;
  callbackUrl: string;
  createdAt: number;
}

export function IntegrationsManager() {
  const apps = useQuery(api.integrations.listVerifierApps, {});
  const stats = useQuery(api.integrations.getVerifierAppStats, {});

  const registerAppMutation = useMutation(api.integrations.adminRegisterVerifierApp);
  const toggleStatusMutation = useMutation(api.integrations.adminToggleVerifierAppStatus);
  const rotateKeyMutation = useMutation(api.integrations.adminRotateVerifierAppApiKey);
  const deleteAppMutation = useMutation(api.integrations.adminDeleteVerifierApp);

  // Modal / Form States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedAppCredentials | null>(null);
  const [rotatedCredentials, setRotatedCredentials] = useState<{ clientId: string; apiKey: string; name: string } | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [description, setDescription] = useState("");
  const [allowedOrigins, setAllowedOrigins] = useState("");
  const [customClientId, setCustomClientId] = useState("");

  // Loading & Feedback States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [togglingAppId, setTogglingAppId] = useState<string | null>(null);

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handlePrefillAIFlow = () => {
    setName("AIFlow Enterprise OS");
    setCallbackUrl("http://localhost:3001/api/verifi/callback");
    setDescription("Autonomous AI Agent Workflow Engine requiring cryptographically verified human authority");
    setAllowedOrigins("http://localhost:3001, https://aiflow.example.com");
    setCustomClientId("vapp_aiflow_enterprise");
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Application name is required.");
      return;
    }

    if (!callbackUrl.trim()) {
      setFormError("Callback URL is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const originsArray = allowedOrigins
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const result = await registerAppMutation({
        name: name.trim(),
        callbackUrl: callbackUrl.trim(),
        description: description.trim() || undefined,
        allowedOrigins: originsArray.length > 0 ? originsArray : undefined,
        customClientId: customClientId.trim() || undefined,
      });

      // Close create form and show one-time raw secret reveal modal
      setIsRegisterModalOpen(false);
      setCreatedCredentials({
        appId: result.appId,
        name: result.name,
        clientId: result.clientId,
        apiKey: result.apiKey,
        callbackUrl: result.callbackUrl,
        createdAt: result.createdAt,
      });

      // Reset form
      setName("");
      setCallbackUrl("");
      setDescription("");
      setAllowedOrigins("");
      setCustomClientId("");
    } catch (err: unknown) {
      console.error("Failed to register verifier application:", err);
      setFormError(err instanceof Error ? err.message : "Failed to register application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (appId: Id<"verifierApps">, currentActive: boolean) => {
    setTogglingAppId(appId);
    try {
      await toggleStatusMutation({
        appId,
        active: !currentActive,
      });
    } catch (err) {
      console.error("Failed to toggle status:", err);
    } finally {
      setTogglingAppId(null);
    }
  };

  const handleRotateKey = async (appId: Id<"verifierApps">, appName: string) => {
    if (!confirm(`Are you sure you want to rotate the API key for '${appName}'? Any external applications using the previous key will immediately fail authentication until updated.`)) {
      return;
    }

    try {
      const result = await rotateKeyMutation({ appId });
      setRotatedCredentials({
        name: appName,
        clientId: result.clientId,
        apiKey: result.apiKey,
      });
    } catch (err: unknown) {
      alert(`Key rotation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDelete = async (appId: Id<"verifierApps">, appName: string) => {
    if (!confirm(`Are you sure you want to delete '${appName}'? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteAppMutation({ appId });
    } catch (err: unknown) {
      alert(`Deletion failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const totalApps = stats?.totalApps ?? (apps?.length || 0);
  const activeApps = stats?.activeApps ?? (apps?.filter((a) => a.active).length || 0);
  const verifiedSessions = stats?.verifiedSessions ?? 0;

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>External Verifier Integrations</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-cyan-300 border border-indigo-200 dark:border-indigo-500/30">
              Zero-Exposure Enclave
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Register and authorize third-party applications (such as AIFlow Enterprise OS) to create verification sessions with Verifi.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setIsRegisterModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-md shadow-indigo-500/20 transition-all self-start sm:self-auto flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Register New Integration</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Registered Apps</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {apps === undefined ? "-" : totalApps}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Total verifier applications configured.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Active Integrations</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            {apps === undefined ? "-" : activeApps}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Enabled &amp; authorized to create sessions.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Verified Sessions</span>
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {stats === undefined ? "-" : verifiedSessions}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Real cryptographic W3C proofs delivered.
          </p>
        </div>
      </div>

      {/* Applications List Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Registered Verifier Applications
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              API key hashes and callback domains for external relying parties.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {apps?.length || 0} configured
          </span>
        </div>

        {apps === undefined ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-mono">Loading registered applications...</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-cyan-400 mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Verifier Applications Registered</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register an external application like <strong>AIFlow Enterprise OS</strong> to enable external verification sessions.
              </p>
            </div>
            <button
              onClick={() => {
                handlePrefillAIFlow();
                setIsRegisterModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm"
            >
              <span>Quick Register AIFlow Enterprise OS</span>
              <span>&rarr;</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="p-3.5">Application</th>
                  <th className="p-3.5">Client ID</th>
                  <th className="p-3.5">Callback URL</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Created</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {apps.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors">
                    <td className="p-3.5 space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{app.name}</span>
                        {app.name.toLowerCase().includes("aiflow") && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                            AIFlow Partner
                          </span>
                        )}
                      </div>
                      {app.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {app.description}
                        </p>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        <span className="truncate max-w-[140px]" title={app.clientId}>{app.clientId}</span>
                        <button
                          onClick={() => handleCopy(app.clientId, `client-${app._id}`)}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                          title="Copy Client ID"
                        >
                          {copiedKey === `client-${app._id}` ? (
                            <span className="text-emerald-500 font-bold text-[10px]">✓</span>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-300 max-w-xs truncate" title={app.callbackUrl}>
                      {app.callbackUrl}
                    </td>

                    <td className="p-3.5">
                      <button
                        disabled={togglingAppId === app._id}
                        onClick={() => handleToggleStatus(app._id, app.active)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                          app.active
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-300"
                        }`}
                        title="Click to toggle active status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${app.active ? "bg-emerald-500" : "bg-slate-500"}`} />
                        <span>{app.active ? "Active" : "Inactive"}</span>
                      </button>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleRotateKey(app._id, app.name)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                        title="Rotate Secret API Key"
                      >
                        Rotate Key
                      </button>

                      <button
                        onClick={() => handleDelete(app._id, app.name)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
                        title="Delete application"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
            <div className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Register Verifier Application
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provisions a server-side Client ID and hashed API key.
                </p>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
              {/* Quick Preset Button */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/20 text-xs">
                <span className="text-indigo-800 dark:text-indigo-300 font-medium">
                  Configuring for AIFlow integration?
                </span>
                <button
                  type="button"
                  onClick={handlePrefillAIFlow}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
                >
                  Prefill AIFlow Preset
                </button>
              </div>

              {/* App Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Application Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AIFlow Enterprise OS"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Callback URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Default Callback URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="e.g. http://localhost:3001/api/verifi/callback or https://aiflow.example.com/api/verifi/callback"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Where users are redirected after consenting to share verification claims.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Autonomous AI workflow agent identity verifier"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Allowed Origins */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Allowed Origins (Optional, comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. http://localhost:3001, https://aiflow.example.com"
                  value={allowedOrigins}
                  onChange={(e) => setAllowedOrigins(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Custom Client ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Custom Client ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. vapp_aiflow_enterprise (auto-generated if blank)"
                  value={customClientId}
                  onChange={(e) => setCustomClientId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {formError}
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Generating Credentials..." : "Create & Generate API Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-Time API Key Reveal Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 shadow-2xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
            {/* Header */}
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Integration Successfully Provisioned
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Save Application Credentials for {createdCredentials.name}
              </h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Critical Warning Alert */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>⚠</span>
                  <span>Important Security Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  The API Key below will <strong>NEVER</strong> be displayed again. It is hashed before storage in Convex and cannot be recovered. Please copy and store it securely in your external app environment (e.g. <code>.env.local</code>).
                </p>
              </div>

              {/* Client ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Client ID
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdCredentials.clientId}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-cyan-300 font-bold"
                  />
                  <button
                    onClick={() => handleCopy(createdCredentials.clientId, "created-client-id")}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedKey === "created-client-id" ? (
                      <span className="text-emerald-500 font-bold">✓ Copied</span>
                    ) : (
                      <span>Copy ID</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Raw API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Secret API Key (One-Time Display)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsKeyVisible(!isKeyVisible)}
                    className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {isKeyVisible ? "Hide Key" : "Show Key"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={isKeyVisible ? "text" : "password"}
                    readOnly
                    value={createdCredentials.apiKey}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-100 dark:bg-slate-950 border border-indigo-500/50 text-indigo-700 dark:text-emerald-300 font-bold tracking-wider select-all"
                  />
                  <button
                    onClick={() => handleCopy(createdCredentials.apiKey, "created-api-key")}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/30 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedKey === "created-api-key" ? (
                      <span>✓ Copied Key!</span>
                    ) : (
                      <span>Copy API Key</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Callback URL Info */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] font-mono space-y-1">
                <span className="text-slate-500">Registered Callback:</span>
                <div className="text-slate-800 dark:text-slate-200 truncate">{createdCredentials.callbackUrl}</div>
              </div>

              <button
                onClick={() => setCreatedCredentials(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                I Have Stored the API Key Securely
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rotated Key Modal */}
      {rotatedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-500/40 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              New API Key Generated for {rotatedCredentials.name}
            </h3>
            <p className="text-xs text-slate-400">
              The previous key is revoked. Copy the new secret API key now:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={rotatedCredentials.apiKey}
                className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-emerald-400 font-bold"
              />
              <button
                onClick={() => handleCopy(rotatedCredentials.apiKey, "rotated-api-key")}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shrink-0 cursor-pointer"
              >
                {copiedKey === "rotated-api-key" ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => setRotatedCredentials(null)}
              className="w-full py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
