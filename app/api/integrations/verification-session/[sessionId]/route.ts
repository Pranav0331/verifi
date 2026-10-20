import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dazzling-armadillo-628.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

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
 * GET /api/integrations/verification-session/[sessionId]
 *
 * Secure server-to-server query endpoint for external verifier apps to fetch verification results.
 * Authenticated via Client ID & API Key.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing sessionId path parameter.", code: "MISSING_SESSION_ID" },
        { status: 400 }
      );
    }

    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing API Key.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const clientId =
      req.headers.get("x-client-id") ||
      req.headers.get("X-Client-ID") ||
      req.nextUrl.searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Missing clientId in header or query parameter.", code: "MISSING_CLIENT_ID" },
        { status: 400 }
      );
    }

    const sessionData = await convex.query(api.integrations.getVerificationSessionStatusForApi, {
      clientId,
      apiKey,
      sessionId,
    });

    return NextResponse.json(
      {
        success: true,
        data: sessionData,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[API /api/integrations/verification-session/[sessionId]] Error:`, errorMsg);

    if (errorMsg.includes("Invalid client credentials") || errorMsg.includes("Invalid API key")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid client credentials or API key.", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    if (errorMsg.includes("Session does not belong")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Session does not belong to this verifier application.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (errorMsg.includes("Verification session not found")) {
      return NextResponse.json(
        { success: false, error: "Verification session not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMsg || "Internal server error.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
