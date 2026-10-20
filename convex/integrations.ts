import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getAuthenticatedUser } from "./lib/auth";
import { hashApiKey, timingSafeEqual, generateSecureId, isValidCallbackUrl } from "./lib/apiAuth";
import { verifyVcSignature } from "./lib/vcVerifier";

async function verifyAdminOrDev(ctx: QueryCtx | MutationCtx) {
  const auth = await getAuthenticatedUser(ctx);
  if (auth) {
    if (auth.user.role !== "admin") {
      throw new Error(`Forbidden: Action requires 'admin' role. Current role: '${auth.user.role}'.`);
    }
    return auth.user;
  }
  return null;
}

/**
 * adminRegisterVerifierApp
 *
 * Secure admin mutation to register a third-party verifier application (e.g. AIFlow Enterprise OS).
 * - Enforces admin authorization via Convex RBAC.
 * - Stores name, clientId, hashed API key, callback URL, active status, createdAt.
 * - Generates cryptographically secure API key server-side.
 * - Returns raw API key ONLY ONCE in the response; never stores raw keys.
 */
export const adminRegisterVerifierApp = mutation({
  args: {
    name: v.string(),
    callbackUrl: v.string(),
    description: v.optional(v.string()),
    allowedOrigins: v.optional(v.array(v.string())),
    customClientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await verifyAdminOrDev(ctx);
    const now = Date.now();

    const name = args.name.trim();
    if (!name) {
      throw new Error("Application name is required.");
    }

    const callbackUrl = args.callbackUrl.trim();
    const callbackValidation = isValidCallbackUrl(callbackUrl, args.allowedOrigins);
    if (!callbackValidation.valid) {
      throw new Error(`Invalid callback URL: ${callbackValidation.reason}`);
    }

    // Generate or validate unique clientId
    let clientId = args.customClientId?.trim();
    if (!clientId) {
      clientId = generateSecureId("vapp", 16);
    } else {
      const existing = await ctx.db
        .query("verifierApps")
        .withIndex("by_clientId", (q) => q.eq("clientId", clientId!))
        .first();
      if (existing) {
        throw new Error(`Verifier application with clientId '${clientId}' already exists.`);
      }
    }

    // Generate cryptographically secure raw API Key (vfi_sec_...)
    const rawApiKey = generateSecureId("vfi_sec", 32);
    const hashedApiKey = await hashApiKey(rawApiKey);

    const appId = await ctx.db.insert("verifierApps", {
      name,
      clientId,
      hashedApiKey,
      callbackUrl,
      active: true,
      description: args.description?.trim(),
      allowedOrigins: args.allowedOrigins || [],
      ownerUserId: admin?._id,
      createdAt: now,
      updatedAt: now,
    });

    return {
      appId,
      name,
      clientId,
      apiKey: rawApiKey, // Revealed only once upon creation
      callbackUrl,
      active: true,
      createdAt: now,
    };
  },
});

/**
 * adminToggleVerifierAppStatus
 *
 * Toggles an external verifier application between active and inactive states.
 * Inactive apps cannot create new verification sessions.
 */
export const adminToggleVerifierAppStatus = mutation({
  args: {
    appId: v.id("verifierApps"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await verifyAdminOrDev(ctx);
    const now = Date.now();

    const app = await ctx.db.get(args.appId);
    if (!app) {
      throw new Error("Verifier application not found.");
    }

    await ctx.db.patch(args.appId, {
      active: args.active,
      updatedAt: now,
    });

    return {
      success: true,
      appId: args.appId,
      active: args.active,
      updatedAt: now,
    };
  },
});

/**
 * adminRotateVerifierAppApiKey
 *
 * Rotates the API key for an external verifier app.
 * The new raw key is returned ONLY ONCE.
 */
export const adminRotateVerifierAppApiKey = mutation({
  args: {
    appId: v.id("verifierApps"),
  },
  handler: async (ctx, args) => {
    await verifyAdminOrDev(ctx);
    const now = Date.now();

    const app = await ctx.db.get(args.appId);
    if (!app) {
      throw new Error("Verifier application not found.");
    }

    const newRawApiKey = generateSecureId("vfi_sec", 32);
    const newHashedKey = await hashApiKey(newRawApiKey);

    await ctx.db.patch(args.appId, {
      hashedApiKey: newHashedKey,
      updatedAt: now,
    });

    return {
      success: true,
      appId: args.appId,
      clientId: app.clientId,
      apiKey: newRawApiKey, // Returned once!
      rotatedAt: now,
    };
  },
});

/**
 * adminDeleteVerifierApp
 *
 * Deletes a registered verifier application and cleans up associated sessions.
 */
export const adminDeleteVerifierApp = mutation({
  args: {
    appId: v.id("verifierApps"),
  },
  handler: async (ctx, args) => {
    await verifyAdminOrDev(ctx);

    const app = await ctx.db.get(args.appId);
    if (!app) {
      throw new Error("Verifier application not found.");
    }

    await ctx.db.delete(args.appId);
    return { success: true, appId: args.appId };
  },
});

/**
 * getVerifierAppStats
 *
 * Returns aggregate metrics on registered verifier apps and sessions.
 */
export const getVerifierAppStats = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthenticatedUser(ctx);
    if (!auth || auth.user.role !== "admin") {
      return {
        totalApps: 0,
        activeApps: 0,
        inactiveApps: 0,
        totalSessions: 0,
        verifiedSessions: 0,
      };
    }

    const apps = await ctx.db.query("verifierApps").collect();
    const sessions = await ctx.db.query("verificationSessions").collect();

    const activeApps = apps.filter((a) => a.active).length;
    const verifiedSessions = sessions.filter((s) => s.status === "verified").length;

    return {
      totalApps: apps.length,
      activeApps,
      inactiveApps: apps.length - activeApps,
      totalSessions: sessions.length,
      verifiedSessions,
    };
  },
});

/**
 * registerVerifierApp
 *
 * Programmatic registration mutation (used by API route or internal tools).
 * NOTE: The raw API key is returned ONLY ONCE upon registration and hashed before storage.
 */
export const registerVerifierApp = mutation({
  args: {
    name: v.string(),
    callbackUrl: v.string(),
    description: v.optional(v.string()),
    allowedOrigins: v.optional(v.array(v.string())),
    customClientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthenticatedUser(ctx);
    const now = Date.now();

    const name = args.name.trim();
    if (!name) {
      throw new Error("Application name is required.");
    }

    const callbackValidation = isValidCallbackUrl(args.callbackUrl, args.allowedOrigins);
    if (!callbackValidation.valid) {
      throw new Error(`Invalid callback URL: ${callbackValidation.reason}`);
    }

    // Generate unique clientId
    let clientId = args.customClientId?.trim();
    if (!clientId) {
      clientId = generateSecureId("vapp", 16);
    } else {
      // Check for collision
      const existing = await ctx.db
        .query("verifierApps")
        .withIndex("by_clientId", (q) => q.eq("clientId", clientId!))
        .first();
      if (existing) {
        throw new Error(`Verifier application with clientId '${clientId}' already exists.`);
      }
    }

    // Generate cryptographically secure API Key (vfi_sec_...)
    const rawApiKey = generateSecureId("vfi_sec", 32);
    const hashedApiKey = await hashApiKey(rawApiKey);

    const appId = await ctx.db.insert("verifierApps", {
      name,
      clientId,
      hashedApiKey,
      callbackUrl: args.callbackUrl.trim(),
      active: true,
      description: args.description?.trim(),
      allowedOrigins: args.allowedOrigins || [],
      ownerUserId: auth?.user._id,
      createdAt: now,
      updatedAt: now,
    });

    return {
      appId,
      name,
      clientId,
      apiKey: rawApiKey, // Revealed only once upon creation
      callbackUrl: args.callbackUrl.trim(),
      active: true,
      createdAt: now,
    };
  },
});

/**
 * listVerifierApps
 *
 * Retrieves all registered verifier applications (excluding sensitive hashed keys).
 */
export const listVerifierApps = query({
  args: {},
  handler: async (ctx) => {
    const apps = await ctx.db.query("verifierApps").collect();
    return apps.map((app) => ({
      _id: app._id,
      name: app.name,
      clientId: app.clientId,
      callbackUrl: app.callbackUrl,
      active: app.active,
      description: app.description,
      allowedOrigins: app.allowedOrigins,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    }));
  },
});

/**
 * getVerifierAppByClientId
 *
 * Retrieves a verifier app by its clientId.
 */
export const getVerifierAppByClientId = query({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db
      .query("verifierApps")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .first();

    if (!app) {
      return null;
    }

    return {
      _id: app._id,
      name: app.name,
      clientId: app.clientId,
      callbackUrl: app.callbackUrl,
      active: app.active,
      description: app.description,
      allowedOrigins: app.allowedOrigins,
      createdAt: app.createdAt,
    };
  },
});

/**
 * createVerificationSession
 *
 * Backend mutation executed by the server-side integration API.
 * Authenticates external request via API Key and creates a short-lived verification session.
 */
export const createVerificationSession = mutation({
  args: {
    clientId: v.string(),
    apiKey: v.string(),
    requestedClaims: v.array(v.string()),
    requestedCredentialType: v.optional(v.string()),
    callbackUrl: v.optional(v.string()),
    nonce: v.optional(v.string()),
    metadata: v.optional(v.any()),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Look up Verifier Application
    const app = await ctx.db
      .query("verifierApps")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .first();

    if (!app) {
      throw new Error("Invalid client credentials: App not found.");
    }

    if (!app.active) {
      throw new Error("Verifier application is currently deactivated.");
    }

    // 2. Authenticate API Key securely using constant-time hash comparison
    const providedKeyHash = await hashApiKey(args.apiKey);
    if (!timingSafeEqual(providedKeyHash, app.hashedApiKey)) {
      throw new Error("Invalid API key authentication.");
    }

    // 3. Validate Requested Claims
    const cleanClaims = args.requestedClaims.map((c) => c.trim()).filter(Boolean);
    if (cleanClaims.length === 0) {
      throw new Error("At least one requested claim is required for verification.");
    }

    // 4. Validate & Resolve Callback URL
    const targetCallbackUrl = (args.callbackUrl?.trim() || app.callbackUrl).trim();
    const urlValidation = isValidCallbackUrl(targetCallbackUrl, app.allowedOrigins, app.callbackUrl);
    if (!urlValidation.valid) {
      throw new Error(`Invalid callback URL: ${urlValidation.reason}`);
    }

    // 5. Generate secure non-guessable session ID and expiration
    const durationMins = args.durationMinutes && args.durationMinutes > 0 ? Math.min(args.durationMinutes, 60) : 15;
    const expiresAt = now + durationMins * 60 * 1000;
    const sessionId = generateSecureId("vsess", 32);

    // 6. Store session record in Convex
    const sessionDocId = await ctx.db.insert("verificationSessions", {
      sessionId,
      verifierAppId: app._id,
      requestedClaims: cleanClaims,
      requestedCredentialType: args.requestedCredentialType?.trim() || undefined,
      status: "pending",
      callbackUrl: targetCallbackUrl,
      nonce: args.nonce?.trim(),
      metadata: args.metadata,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      sessionDocId,
      sessionId,
      status: "pending" as const,
      expiresAt,
      requestedClaims: cleanClaims,
      requestedCredentialType: args.requestedCredentialType,
      verifierApp: {
        name: app.name,
        clientId: app.clientId,
      },
    };
  },
});

/**
 * getVerificationSession
 *
 * Fetches verification session details for the user consent page.
 * Masks sensitive internal information and automatically evaluates expiration.
 */
export const getVerificationSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const session = await ctx.db
      .query("verificationSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return null;
    }

    const app = await ctx.db.get(session.verifierAppId);
    if (!app) {
      return null;
    }

    const isExpired = now > session.expiresAt;
    const effectiveStatus = isExpired && session.status === "pending" ? ("expired" as const) : session.status;

    return {
      sessionId: session.sessionId,
      status: effectiveStatus,
      requestedClaims: session.requestedClaims,
      requestedCredentialType: session.requestedCredentialType,
      callbackUrl: session.callbackUrl,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      verifiedAt: session.verifiedAt,
      verificationResult: session.verificationResult,
      failureReason: session.failureReason,
      verifierApp: {
        name: app.name,
        clientId: app.clientId,
        description: app.description,
        callbackUrl: app.callbackUrl,
      },
    };
  },
});

/**
 * submitVerificationConsent
 *
 * User-facing mutation on the Verifi consent page.
 * The holder approves sharing their credential for the requested verification session.
 * Cryptographically verifies the credential and updates the session and audit logs.
 */
export const submitVerificationConsent = mutation({
  args: {
    sessionId: v.string(),
    credentialDocId: v.id("credentials"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // 1. Fetch verification session
    const session = await ctx.db
      .query("verificationSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Verification session not found.");
    }

    if (now > session.expiresAt || session.status === "expired") {
      if (session.status !== "expired") {
        await ctx.db.patch(session._id, { status: "expired", updatedAt: now });
      }
      throw new Error("Verification session has expired. Please initiate a new verification request.");
    }

    if (session.status !== "pending") {
      throw new Error(`Verification session is already in '${session.status}' state.`);
    }

    // 2. Fetch credential document
    const cred = await ctx.db.get(args.credentialDocId);
    if (!cred) {
      throw new Error("Selected credential not found.");
    }

    // Ensure the current user owns this credential
    const isOwner = cred.recipientUserId === user._id || cred.recipientDid === user.did;
    if (!isOwner && user.role !== "admin") {
      throw new Error("Unauthorized: You do not own the selected credential.");
    }

    // 3. Cryptographic Verification of the real W3C Verifiable Credential
    let parsedVc: Record<string, unknown> | null = null;
    let failureReason: string | undefined = undefined;
    let signatureValid = false;

    try {
      parsedVc = JSON.parse(cred.rawVcJson);
    } catch {
      failureReason = "Malformed credential JSON-LD payload.";
    }

    if (parsedVc) {
      const cryptoResult = await verifyVcSignature(parsedVc);
      signatureValid = cryptoResult.isValid;
      if (!cryptoResult.isValid) {
        failureReason = cryptoResult.error || "Cryptographic digital signature verification failed.";
      }
    }

    const expirationValid = !cred.expirationDate || now <= cred.expirationDate;
    if (!expirationValid && !failureReason) {
      failureReason = `Credential expired on ${new Date(cred.expirationDate!).toUTCString()}.`;
    }

    const statusValid = cred.status === "active";
    if (!statusValid && !failureReason) {
      failureReason = `Credential was revoked by issuer (${cred.revocationReason || "Revoked"}).`;
    }

    let result: "VERIFIED" | "INVALID" | "REVOKED" | "EXPIRED" = "VERIFIED";
    if (!signatureValid || !parsedVc) {
      result = "INVALID";
    } else if (!statusValid) {
      result = "REVOKED";
    } else if (!expirationValid) {
      result = "EXPIRED";
    }

    const sessionOutcomeStatus: "verified" | "rejected" = result === "VERIFIED" ? "verified" : "rejected";

    // 4. Update verification session record
    await ctx.db.patch(session._id, {
      status: sessionOutcomeStatus,
      userId: user._id,
      credentialId: cred.credentialId,
      credentialDocId: cred._id,
      verificationResult: result,
      failureReason: failureReason,
      verifiedAt: now,
      updatedAt: now,
    });

    const app = await ctx.db.get(session.verifierAppId);

    // 5. Create audit record in `verifications` table
    await ctx.db.insert("verifications", {
      verifierUserId: user._id,
      verifierClerkId: user.clerkId,
      verifierRole: "verifier",
      credentialId: cred.credentialId,
      credentialDocId: cred._id,
      credentialType: cred.type,
      issuerDid: cred.issuerDid,
      issuerName: cred.issuerName,
      recipientDid: cred.recipientDid,
      result,
      signatureValid,
      integrityValid: signatureValid,
      statusValid,
      expirationValid,
      failureReason,
      claimsSummary: cred.credentialData || {},
      blockchainAnchored: cred.blockchainAnchorStatus === "ANCHORED",
      blockchainCredentialHash: cred.blockchainCredentialHash,
      blockchainContractAddress: cred.blockchainContractAddress,
      blockchainTxHash: cred.blockchainTxHash,
      blockchainBlockNumber: cred.blockchainBlockNumber,
      blockchainNetwork: cred.blockchainNetwork || "sepolia",
      blockchainAnchoredAt: cred.blockchainAnchoredAt,
      verifiedAt: now,
    });

    // 6. Build callback redirect URL
    const callbackUrlObj = new URL(session.callbackUrl);
    callbackUrlObj.searchParams.set("session_id", session.sessionId);
    callbackUrlObj.searchParams.set("status", sessionOutcomeStatus);
    callbackUrlObj.searchParams.set("result", result);
    if (session.nonce) {
      callbackUrlObj.searchParams.set("nonce", session.nonce);
    }

    return {
      success: true,
      sessionId: session.sessionId,
      status: sessionOutcomeStatus,
      result,
      failureReason,
      callbackUrl: callbackUrlObj.toString(),
      verifierAppName: app?.name || "Verifier App",
      verifiedAt: now,
    };
  },
});

/**
 * rejectVerificationSession
 *
 * User explicitly declines the verification request.
 */
export const rejectVerificationSession = mutation({
  args: {
    sessionId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const session = await ctx.db
      .query("verificationSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Verification session not found.");
    }

    if (session.status !== "pending") {
      throw new Error(`Verification session is already in '${session.status}' state.`);
    }

    await ctx.db.patch(session._id, {
      status: "rejected",
      userId: user._id,
      failureReason: args.reason || "Verification rejected by credential holder.",
      updatedAt: now,
    });

    const callbackUrlObj = new URL(session.callbackUrl);
    callbackUrlObj.searchParams.set("session_id", session.sessionId);
    callbackUrlObj.searchParams.set("status", "rejected");
    if (session.nonce) {
      callbackUrlObj.searchParams.set("nonce", session.nonce);
    }

    return {
      success: true,
      sessionId: session.sessionId,
      status: "rejected" as const,
      callbackUrl: callbackUrlObj.toString(),
    };
  },
});

/**
 * getVerificationSessionStatusForApi
 *
 * Server-to-server API query for external verifier apps to fetch verification results.
 * Authenticated via client credentials.
 */
export const getVerificationSessionStatusForApi = query({
  args: {
    clientId: v.string(),
    apiKey: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db
      .query("verifierApps")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .first();

    if (!app || !app.active) {
      throw new Error("Invalid client credentials or inactive verifier app.");
    }

    const providedKeyHash = await hashApiKey(args.apiKey);
    if (!timingSafeEqual(providedKeyHash, app.hashedApiKey)) {
      throw new Error("Invalid API key authentication.");
    }

    const session = await ctx.db
      .query("verificationSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Verification session not found.");
    }

    if (session.verifierAppId !== app._id) {
      throw new Error("Unauthorized: Session does not belong to this verifier application.");
    }

    let credentialClaims: Record<string, unknown> | null = null;
    let blockchainProof: Record<string, unknown> | null = null;
    let issuerInfo: Record<string, unknown> | null = null;

    if (session.status === "verified" && session.credentialDocId) {
      const cred = await ctx.db.get(session.credentialDocId);
      if (cred) {
        // Filter claims to only requestedClaims
        const allClaims = (cred.credentialData || {}) as Record<string, unknown>;
        credentialClaims = {};
        for (const claimKey of session.requestedClaims) {
          if (claimKey in allClaims) {
            credentialClaims[claimKey] = allClaims[claimKey];
          }
        }

        issuerInfo = {
          did: cred.issuerDid,
          name: cred.issuerName,
        };

        blockchainProof = {
          anchored: cred.blockchainAnchorStatus === "ANCHORED",
          txHash: cred.blockchainTxHash,
          contractAddress: cred.blockchainContractAddress,
          network: cred.blockchainNetwork || "sepolia",
          blockNumber: cred.blockchainBlockNumber,
        };
      }
    }

    return {
      sessionId: session.sessionId,
      status: session.status,
      verificationResult: session.verificationResult,
      failureReason: session.failureReason,
      requestedClaims: session.requestedClaims,
      verifiedClaims: credentialClaims,
      issuer: issuerInfo,
      blockchain: blockchainProof,
      verifiedAt: session.verifiedAt,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  },
});
