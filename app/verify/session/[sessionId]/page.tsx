"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";

interface VerifySessionPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default function VerifySessionPage({ params }: VerifySessionPageProps) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  const { isSignedIn, isLoaded: isUserLoaded, user } = useUser();

  const session = useQuery(api.integrations.getVerificationSession, { sessionId });
  const myCredentials = useQuery(
    api.credentials.getMyReceivedCredentials,
    isSignedIn ? {} : "skip"
  );

  const submitConsentMutation = useMutation(api.integrations.submitVerificationConsent);
  const rejectSessionMutation = useMutation(api.integrations.rejectVerificationSession);

  const [selectedCredentialId, setSelectedCredentialId] = useState<Id<"credentials"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRedirectUrl, setSuccessRedirectUrl] = useState<string | null>(null);

  // Loading Session State
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm font-mono text-slate-400">Loading verification session...</p>
        </div>
      </div>
    );
  }

  // Not Found State
  if (session === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            ✕
          </div>
          <h1 className="text-xl font-bold text-white">Session Not Found</h1>
          <p className="text-xs text-slate-400">
            The verification session ID is invalid, or the session was deleted.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
          >
            Return to Verifi Home
          </Link>
        </div>
      </div>
    );
  }

  // Expired State
  if (session.status === "expired") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-amber-500/30 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠
          </div>
          <h1 className="text-xl font-bold text-white">Session Expired</h1>
          <p className="text-xs text-slate-400">
            This verification session has expired. Verification sessions are short-lived for security and privacy.
          </p>
          <div className="pt-2">
            <span className="text-[11px] font-mono text-slate-500">
              Requested by: <strong className="text-slate-300">{session.verifierApp.name}</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Already Verified State
  if (session.status === "verified" || successRedirectUrl) {
    const targetUrl = successRedirectUrl || session.callbackUrl;
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-emerald-500/40 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              VERIFIED
            </span>
            <h1 className="text-xl font-bold text-white pt-1">Verification Authorized</h1>
            <p className="text-xs text-slate-400">
              Your credential claims were cryptographically verified and approved for{" "}
              <strong className="text-slate-200">{session.verifierApp.name}</strong>.
            </p>
          </div>

          <div className="pt-2">
            <a
              href={targetUrl}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/30 transition-all"
            >
              <span>Return to {session.verifierApp.name}</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Handle User Action: Authorize
  const handleAuthorize = async () => {
    if (!selectedCredentialId) {
      setErrorMessage("Please select one of your Verifiable Credentials to present.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await submitConsentMutation({
        sessionId,
        credentialDocId: selectedCredentialId,
      });

      if (res.success && res.callbackUrl) {
        setSuccessRedirectUrl(res.callbackUrl);
        // Automatic redirect after brief moment
        setTimeout(() => {
          window.location.href = res.callbackUrl;
        }, 1200);
      }
    } catch (err: unknown) {
      console.error("Authorization error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to authorize verification.");
      setIsSubmitting(false);
    }
  };

  // Handle User Action: Reject
  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      const res = await rejectSessionMutation({
        sessionId,
        reason: "Declined by user.",
      });

      if (res.callbackUrl) {
        window.location.href = res.callbackUrl;
      }
    } catch (err: unknown) {
      console.error("Rejection error:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Ambient background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/30">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-indigo-400 font-bold text-sm">
                V
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent group-hover:to-white transition-all">
              Verifi
            </span>
          </Link>

          <span className="px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-slate-900 border border-slate-800 text-slate-400">
            External App Consent
          </span>
        </div>

        {/* Main Consent Card */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl overflow-hidden divide-y divide-slate-800/80">
          {/* App Header Banner */}
          <div className="p-6 sm:p-8 bg-gradient-to-b from-indigo-950/40 to-transparent space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                  Verification Request
                </span>
                <h1 className="text-xl font-bold text-white">
                  {session.verifierApp.name}
                </h1>
                {session.verifierApp.description && (
                  <p className="text-xs text-slate-400">
                    {session.verifierApp.description}
                  </p>
                )}
              </div>

              <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 shrink-0">
                ID: {session.verifierApp.clientId}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-slate-300 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
              <span>
                This app is requesting cryptographic proof of your identity claims via Verifi.
              </span>
            </div>
          </div>

          {/* Requested Claims Section */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Requested Claims &amp; Attributes
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {session.requestedClaims.length} claim{session.requestedClaims.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {session.requestedClaims.map((claim) => (
                <span
                  key={claim}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-medium text-indigo-300 flex items-center gap-1.5"
                >
                  <span className="text-indigo-400 font-bold">✓</span>
                  {claim}
                </span>
              ))}
            </div>

            {session.requestedCredentialType && (
              <div className="pt-2 text-[11px] font-mono text-slate-400">
                Target Credential Type: <strong className="text-slate-200">{session.requestedCredentialType}</strong>
              </div>
            )}
          </div>

          {/* User Authentication & Credential Selection */}
          <div className="p-6 space-y-4">
            {!isUserLoaded ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : !isSignedIn ? (
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-white">Sign In to Select Your Credential</h2>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Sign in to your Verifi identity wallet or use your registered Passkey to present your credentials.
                  </p>
                </div>
                <SignInButton mode="modal">
                  <button className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/30 transition-all">
                    Sign In with Verifi / Clerk
                  </button>
                </SignInButton>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Select Credential from Your Wallet
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Logged in as {user?.primaryEmailAddress?.emailAddress || user?.username}
                  </span>
                </div>

                {myCredentials === undefined ? (
                  <div className="p-6 text-center">
                    <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                  </div>
                ) : myCredentials.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-center space-y-2">
                    <p className="text-xs text-amber-300 font-medium">
                      No Verifiable Credentials found in your wallet.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      You need an issued W3C credential to complete this verification. Ask an authorized issuer to issue you a credential.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {myCredentials.map((cred) => {
                      const isSelected = selectedCredentialId === cred._id;
                      const typeName = cred.type.find((t) => t !== "VerifiableCredential") || "VerifiableCredential";
                      const claimsCount = cred.credentialData ? Object.keys(cred.credentialData).length : 0;

                      return (
                        <div
                          key={cred._id}
                          onClick={() => setSelectedCredentialId(cred._id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left flex items-start justify-between gap-3 ${
                            isSelected
                              ? "bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-950/50"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950/90"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{typeName}</span>
                              {cred.blockchainAnchorStatus === "ANCHORED" && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                                  Sepolia
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                                ECDSA P-256
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Issued by: <strong className="text-slate-300">{cred.issuerName}</strong>
                            </p>
                            <div className="text-[10px] font-mono text-slate-500">
                              {claimsCount} attested claim{claimsCount !== 1 ? "s" : ""} • Issued on{" "}
                              {new Date(cred.issuedAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-all ${
                              isSelected
                                ? "bg-indigo-600 border-indigo-500 text-white"
                                : "border-slate-700 bg-slate-900"
                            }`}
                          >
                            {isSelected && <span className="text-[10px] font-bold">✓</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-6 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleReject}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all order-2 sm:order-1"
            >
              Decline Request
            </button>

            <button
              type="button"
              disabled={isSubmitting || !isSignedIn || !selectedCredentialId}
              onClick={handleAuthorize}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition-all order-1 sm:order-2 flex items-center justify-center gap-2 ${
                !isSignedIn || !selectedCredentialId || isSubmitting
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/30"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credential...</span>
                </>
              ) : (
                <>
                  <span>Authorize &amp; Verify</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
