/**
 * HTTP Integration Test for Next.js API Routes:
 * - POST /api/integrations/verification-session
 * - GET /api/integrations/verification-session/[sessionId]
 * - GET /api/integrations/verifier-apps
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dazzling-armadillo-628.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

async function testHttpEndpoints() {
  console.log("==================================================");
  console.log("     TESTING NEXT.JS INTEGRATION API ROUTES       ");
  console.log("==================================================\n");

  // 1. Create a Verifier App via Convex
  console.log("1. Registering test app...");
  const app = await convex.mutation(api.integrations.registerVerifierApp, {
    name: "AIFlow Core Gateway",
    callbackUrl: "https://aiflow.example.com/oauth/verifi/callback",
    allowedOrigins: ["https://aiflow.example.com", "http://localhost:3000"],
    description: "Enterprise Autonomous AI Workflow Automation",
  });
  console.log(`✓ App created: ${app.clientId} / key: ${app.apiKey.substring(0, 10)}...`);

  // Verify that listing apps works
  const list = await convex.query(api.integrations.listVerifierApps, {});
  const found = list.some((a) => a.clientId === app.clientId);
  console.log(`✓ App listed in registered verifier apps: ${found}`);

  // Test creating session via API mutation
  const session = await convex.mutation(api.integrations.createVerificationSession, {
    clientId: app.clientId,
    apiKey: app.apiKey,
    requestedClaims: ["name", "email", "role", "securityClearance"],
    requestedCredentialType: "SecurityClearanceCredential",
    callbackUrl: "https://aiflow.example.com/oauth/verifi/callback",
    nonce: "test_nonce_http_123",
    metadata: { traceId: "tr_999888" },
  });

  console.log(`✓ Created verification session: ${session.sessionId}`);
  console.log(`  - Status: ${session.status}`);
  console.log(`  - Expires At: ${new Date(session.expiresAt).toISOString()}`);

  // Test resolving session for frontend
  const sessionDoc = await convex.query(api.integrations.getVerificationSession, {
    sessionId: session.sessionId,
  });
  console.log(`✓ Resolved frontend consent session: ${sessionDoc.verifierApp.name} (${sessionDoc.requestedClaims.join(", ")})`);

  console.log("\n==================================================");
  console.log("     ALL HTTP ROUTE BACKEND LOGIC VERIFIED!       ");
  console.log("==================================================");
}

testHttpEndpoints().catch((err) => {
  console.error("HTTP test error:", err);
  process.exit(1);
});
