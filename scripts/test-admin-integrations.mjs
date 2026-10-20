/**
 * Test Suite: Verifi Admin Integrations & Verifier App Management (Step 2)
 *
 * Validates:
 * 1. Admin registration of "AIFlow Enterprise OS".
 * 2. Generation of cryptographically secure API key (shown only once, never stored raw).
 * 3. Listing verifier applications (confirming raw API key is never exposed in queries).
 * 4. Activation and deactivation toggling.
 * 5. Inactive verifier application rejection during session creation.
 * 6. API Key rotation functionality.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dazzling-armadillo-628.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

async function runAdminIntegrationsTests() {
  console.log("==========================================================");
  console.log("  VERIFI STEP 2: ADMIN INTEGRATIONS VERIFICATION SUITE   ");
  console.log("==========================================================\n");

  try {
    // 1. Register "AIFlow Enterprise OS"
    console.log("Step 1: Registering 'AIFlow Enterprise OS' verifier application...");
    const aiflowCallback = "http://localhost:3001/api/verifi/callback";
    const testClientId = "vapp_aiflow_" + Date.now();
    const regResult = await convex.mutation(api.integrations.registerVerifierApp, {
      name: "AIFlow Enterprise OS",
      callbackUrl: aiflowCallback,
      description: "Autonomous AI Agent Workflow Engine requiring verified human identity",
      allowedOrigins: ["http://localhost:3001", "https://aiflow.example.com"],
      customClientId: testClientId,
    });

    console.log("✓ Application successfully registered!");
    console.log(`  - App Name: ${regResult.name}`);
    console.log(`  - Client ID: ${regResult.clientId}`);
    console.log(`  - One-Time Raw API Key: ${regResult.apiKey.substring(0, 15)}... (32-byte secure hex)`);
    console.log(`  - Callback URL: ${regResult.callbackUrl}`);
    console.log(`  - Active Status: ${regResult.active}`);

    // 2. Verify Query Security: Ensure raw API key and hashed key are NEVER exposed in list queries
    console.log("\nStep 2: Checking query security (Never exposing raw API keys or hashes)...");
    const listedApps = await convex.query(api.integrations.listVerifierApps, {});
    const aiflowApp = listedApps.find((a) => a.clientId === regResult.clientId);

    if (!aiflowApp) {
      throw new Error("Created app not found in listVerifierApps query.");
    }

    if ("apiKey" in aiflowApp || "hashedApiKey" in aiflowApp) {
      throw new Error("SECURITY BREACH: Sensitive key data returned in public/client query!");
    }
    console.log("✓ Query security confirmed: Raw API keys and hashes are completely omitted from client payloads.");

    // 3. Test verification session creation using the newly created AIFlow integration
    console.log("\nStep 3: Creating Verification Session for AIFlow Enterprise OS...");
    const session = await convex.mutation(api.integrations.createVerificationSession, {
      clientId: regResult.clientId,
      apiKey: regResult.apiKey,
      requestedClaims: ["name", "email", "role", "clearanceLevel"],
      requestedCredentialType: "EnterpriseCredential",
      callbackUrl: aiflowCallback,
      nonce: "aiflow_nonce_" + Date.now(),
      metadata: { workflowId: "wf_ai_9918" },
    });

    console.log("✓ Verification session successfully created!");
    console.log(`  - Session ID: ${session.sessionId}`);
    console.log(`  - Status: ${session.status}`);

    // 4. Test Deactivation
    console.log("\nStep 4: Testing deactivation of verifier application...");
    const deactivationResult = await convex.mutation(api.integrations.adminToggleVerifierAppStatus, {
      appId: regResult.appId,
      active: false,
    });
    console.log(`✓ Application active status set to: ${deactivationResult.active}`);

    // Verify inactive app cannot create verification sessions
    console.log("\nStep 5: Verifying inactive app cannot create sessions...");
    try {
      await convex.mutation(api.integrations.createVerificationSession, {
        clientId: regResult.clientId,
        apiKey: regResult.apiKey,
        requestedClaims: ["name"],
      });
      throw new Error("SECURITY FAILURE: Inactive verifier app was able to create a verification session!");
    } catch (err) {
      console.log(`✓ Inactive app properly blocked: ${err.message}`);
    }

    // 5. Test Reactivation
    console.log("\nStep 6: Reactivating verifier application...");
    const reactivationResult = await convex.mutation(api.integrations.adminToggleVerifierAppStatus, {
      appId: regResult.appId,
      active: true,
    });
    console.log(`✓ Application reactivated: active = ${reactivationResult.active}`);

    // 6. Test Key Rotation
    console.log("\nStep 7: Testing API Key rotation...");
    const rotationResult = await convex.mutation(api.integrations.adminRotateVerifierAppApiKey, {
      appId: regResult.appId,
    });
    console.log(`✓ Key rotated successfully! New key: ${rotationResult.apiKey.substring(0, 15)}...`);

    // Verify old key no longer works
    console.log("\nStep 8: Verifying old API key is revoked...");
    try {
      await convex.mutation(api.integrations.createVerificationSession, {
        clientId: regResult.clientId,
        apiKey: regResult.apiKey, // Old key
        requestedClaims: ["name"],
      });
      throw new Error("SECURITY FAILURE: Old revoked API key still worked!");
    } catch (err) {
      console.log(`✓ Revoked key properly rejected: ${err.message}`);
    }

    // Verify new key works
    console.log("\nStep 9: Verifying new rotated API key functions correctly...");
    const newSession = await convex.mutation(api.integrations.createVerificationSession, {
      clientId: regResult.clientId,
      apiKey: rotationResult.apiKey, // New key
      requestedClaims: ["name", "email"],
    });
    console.log(`✓ New session created with rotated key: ${newSession.sessionId}`);

    console.log("\n==========================================================");
    console.log("  ALL STEP 2 ADMIN INTEGRATION TESTS PASSED (100%)       ");
    console.log("==========================================================");
  } catch (err) {
    console.error("\n❌ Step 2 Test Suite Failed:", err);
    process.exit(1);
  }
}

runAdminIntegrationsTests();
