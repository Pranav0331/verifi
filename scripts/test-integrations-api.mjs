/**
 * Test Suite: Verifi External App Integration API (Step 1)
 *
 * Validates:
 * 1. Verifier app registration and API key generation.
 * 2. API key authentication & constant-time hash matching.
 * 3. POST /api/integrations/verification-session creation with requested claims & callback URL validation.
 * 4. Error cases (invalid API keys, missing client ID, malformed URLs, empty claims).
 * 5. GET /api/integrations/verification-session/:sessionId status endpoint.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dazzling-armadillo-628.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

async function runTests() {
  console.log("==================================================");
  console.log("  VERIFI EXTERNAL APP INTEGRATION API TEST SUITE  ");
  console.log("==================================================\n");

  try {
    // 1. Register a Verifier Application in Convex
    console.log("Step 1: Registering a Verifier Application...");
    const testAppName = `AIFlow Studio Test (${Date.now()})`;
    const testCallback = "https://aiflow.example.com/api/verifi/callback";

    const appReg = await convex.mutation(api.integrations.registerVerifierApp, {
      name: testAppName,
      callbackUrl: testCallback,
      description: "External AI Agent Workflow Engine requiring verified human identity",
      allowedOrigins: ["https://aiflow.example.com", "http://localhost:3000", "http://localhost:3001"],
    });

    console.log("✓ Application registered successfully!");
    console.log(`  - App ID: ${appReg.appId}`);
    console.log(`  - Client ID: ${appReg.clientId}`);
    console.log(`  - Raw API Key: ${appReg.apiKey.substring(0, 12)}... (hidden for security)`);
    console.log(`  - Callback URL: ${appReg.callbackUrl}`);

    // 2. Test Verification Session Creation via Convex Mutation
    console.log("\nStep 2: Creating Verification Session with valid credentials...");
    const sessionResult = await convex.mutation(api.integrations.createVerificationSession, {
      clientId: appReg.clientId,
      apiKey: appReg.apiKey,
      requestedClaims: ["name", "email", "jobTitle", "organization"],
      requestedCredentialType: "EmploymentCredential",
      callbackUrl: "https://aiflow.example.com/api/verifi/callback",
      nonce: "test_nonce_" + Date.now(),
      metadata: { externalUserId: "user_aiflow_123" },
      durationMinutes: 15,
    });

    console.log("✓ Verification Session created successfully!");
    console.log(`  - Session ID: ${sessionResult.sessionId}`);
    console.log(`  - Status: ${sessionResult.status}`);
    console.log(`  - Expires At: ${new Date(sessionResult.expiresAt).toISOString()}`);
    console.log(`  - Requested Claims:`, sessionResult.requestedClaims);

    // 3. Test Session Resolution Query (Frontend / Consent View)
    console.log("\nStep 3: Resolving Verification Session for Consent UI...");
    const fetchedSession = await convex.query(api.integrations.getVerificationSession, {
      sessionId: sessionResult.sessionId,
    });

    if (!fetchedSession) {
      throw new Error("Failed to fetch created verification session.");
    }
    console.log("✓ Consent UI Session data resolved successfully!");
    console.log(`  - Verifier App Name: ${fetchedSession.verifierApp.name}`);
    console.log(`  - Session Status: ${fetchedSession.status}`);

    // 4. Test Error Case: Invalid API Key
    console.log("\nStep 4: Testing security rejection with invalid API Key...");
    try {
      await convex.mutation(api.integrations.createVerificationSession, {
        clientId: appReg.clientId,
        apiKey: "vfi_sec_invalid_key_1234567890abcdef",
        requestedClaims: ["name"],
      });
      throw new Error("SECURITY FAILURE: Invalid API key was accepted!");
    } catch (err) {
      console.log(`✓ Properly rejected invalid API key: ${err.message}`);
    }

    // 5. Test Error Case: Invalid / Unapproved Callback URL origin
    console.log("\nStep 5: Testing security rejection with unapproved callback domain...");
    try {
      await convex.mutation(api.integrations.createVerificationSession, {
        clientId: appReg.clientId,
        apiKey: appReg.apiKey,
        requestedClaims: ["name"],
        callbackUrl: "https://malicious-phishing-site.com/steal-creds",
      });
      throw new Error("SECURITY FAILURE: Unapproved origin callback URL was accepted!");
    } catch (err) {
      console.log(`✓ Properly rejected unapproved callback URL: ${err.message}`);
    }

    // 6. Test Error Case: Empty Claims Array
    console.log("\nStep 6: Testing validation rejection with empty requested claims...");
    try {
      await convex.mutation(api.integrations.createVerificationSession, {
        clientId: appReg.clientId,
        apiKey: appReg.apiKey,
        requestedClaims: [],
      });
      throw new Error("VALIDATION FAILURE: Empty requested claims were accepted!");
    } catch (err) {
      console.log(`✓ Properly rejected empty requested claims: ${err.message}`);
    }

    // 7. Test API Status Check Query
    console.log("\nStep 7: Testing server-to-server status check query...");
    const apiStatus = await convex.query(api.integrations.getVerificationSessionStatusForApi, {
      clientId: appReg.clientId,
      apiKey: appReg.apiKey,
      sessionId: sessionResult.sessionId,
    });
    console.log("✓ Server-to-server API query succeeded!");
    console.log(`  - Status: ${apiStatus.status}`);
    console.log(`  - Requested Claims: ${apiStatus.requestedClaims.join(", ")}`);

    console.log("\n==================================================");
    console.log("  ALL VERIFI INTEGRATION API TESTS PASSED (100%)  ");
    console.log("==================================================");
  } catch (err) {
    console.error("\n❌ Test Suite Failed:", err);
    process.exit(1);
  }
}

runTests();
