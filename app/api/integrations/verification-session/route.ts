import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dazzling-armadillo-628.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

/**
 * Helper to resolve Base App URL
 */
function getAppBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Extracts API Key from Authorization header or x-api-key header
 */
function extractApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7).trim();
    }
    return authHeader.trim();
  }
  const xApiKey = req.headers.get("x-api-key") || req.headers.get("X-API-Key");
  if (xApiKey) {
    return xApiKey.trim();
  }
  return null;
}

/**
 * POST /api/integrations/verification-session
 *
 * Production-ready external verification session creation endpoint.
 * - Authenticates external apps via hashed API key (never exposes secrets to browser).
 * - Validates requested claims, callback URL, and parameters.
 * - Creates short-lived, non-guessable verification session in Convex.
 * - Returns only session ID and canonical Verifi verification/consent URL.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate External API Request
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Missing API Key in Authorization or x-api-key header.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // 2. Parse & Validate Request Body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request: Malformed JSON payload.",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    // Extract Client ID from header or body
    const clientIdHeader = req.headers.get("x-client-id") || req.headers.get("X-Client-ID");
    const clientId = (typeof body.clientId === "string" ? body.clientId : clientIdHeader)?.trim();

    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request: Missing 'clientId' in request body or 'x-client-id' header.",
          code: "MISSING_CLIENT_ID",
        },
        { status: 400 }
      );
    }

    // Validate requestedClaims
    const requestedClaims = body.requestedClaims;
    if (!Array.isArray(requestedClaims) || requestedClaims.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request: 'requestedClaims' must be a non-empty array of claim field strings.",
          code: "INVALID_REQUESTED_CLAIMS",
        },
        { status: 400 }
      );
    }

    const cleanClaims = requestedClaims.filter((c): c is string => typeof c === "string" && c.trim().length > 0);
    if (cleanClaims.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request: 'requestedClaims' contains no valid string claims.",
          code: "INVALID_REQUESTED_CLAIMS",
        },
        { status: 400 }
      );
    }

    const requestedCredentialType =
      typeof body.requestedCredentialType === "string" ? body.requestedCredentialType.trim() : undefined;
    const callbackUrl = typeof body.callbackUrl === "string" ? body.callbackUrl.trim() : undefined;
    const nonce = typeof body.nonce === "string" ? body.nonce.trim() : undefined;
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : undefined;
    const durationMinutes = typeof body.durationMinutes === "number" ? body.durationMinutes : 15;

    // 3. Create Session in Convex Backend
    const sessionResult = await convex.mutation(api.integrations.createVerificationSession, {
      clientId,
      apiKey,
      requestedClaims: cleanClaims,
      requestedCredentialType,
      callbackUrl,
      nonce,
      metadata,
      durationMinutes,
    });

    const baseUrl = getAppBaseUrl(req);
    const verificationUrl = `${baseUrl}/verify/session/${sessionResult.sessionId}`;

    // 4. Return Clean, Secure Integration Response
    return NextResponse.json(
      {
        success: true,
        sessionId: sessionResult.sessionId,
        verificationUrl,
        status: sessionResult.status,
        expiresAt: sessionResult.expiresAt,
        requestedClaims: sessionResult.requestedClaims,
        verifierApp: sessionResult.verifierApp,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[API /api/integrations/verification-session] Error:", errorMsg);

    // Return proper HTTP status codes for auth / validation failures
    if (errorMsg.includes("Invalid client credentials") || errorMsg.includes("Invalid API key")) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid client credentials or API key.",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    }

    if (errorMsg.includes("deactivated")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Verifier application is inactive or suspended.",
          code: "APP_INACTIVE",
        },
        { status: 403 }
      );
    }

    if (errorMsg.includes("Invalid callback URL")) {
      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          code: "INVALID_CALLBACK_URL",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMsg || "Internal server error occurred while creating verification session.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
