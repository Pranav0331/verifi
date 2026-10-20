import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dazzling-armadillo-628.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

/**
 * POST /api/integrations/verifier-apps
 *
 * Registers a new verifier application.
 * Returns generated clientId and raw apiKey (revealed only once!).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    // Allow either logged-in user or master secret header (for dev/automation)
    const masterSecret = process.env.INTEGRATION_ADMIN_SECRET;
    const providedSecret = req.headers.get("x-admin-secret");

    const isAuthorized =
      (user && user.id) ||
      (masterSecret && providedSecret && masterSecret === providedSecret) ||
      process.env.NODE_ENV !== "production";

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Authentication required to register verifier app.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, callbackUrl, description, allowedOrigins, customClientId } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Bad Request: Missing or invalid 'name'.", code: "INVALID_NAME" },
        { status: 400 }
      );
    }

    if (!callbackUrl || typeof callbackUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "Bad Request: Missing or invalid 'callbackUrl'.", code: "INVALID_CALLBACK_URL" },
        { status: 400 }
      );
    }

    const result = await convex.mutation(api.integrations.registerVerifierApp, {
      name,
      callbackUrl,
      description: typeof description === "string" ? description : undefined,
      allowedOrigins: Array.isArray(allowedOrigins) ? allowedOrigins : undefined,
      customClientId: typeof customClientId === "string" ? customClientId : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[API /api/integrations/verifier-apps] Error:", errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg, code: "REGISTRATION_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/verifier-apps
 *
 * Lists registered verifier applications (excluding private secret keys).
 */
export async function GET() {
  try {
    const apps = await convex.query(api.integrations.listVerifierApps, {});
    return NextResponse.json({
      success: true,
      data: apps,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMsg, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
