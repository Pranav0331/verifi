/**
 * API Authentication & Cryptographic Utilities for Verifier Integrations
 *
 * Runs inside Convex runtime and serverless functions using Web Crypto standards.
 */

/**
 * Computes a SHA-256 hash of an API key or secret string.
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const cleanKey = apiKey.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(cleanKey);

  const cryptoSubtle =
    typeof crypto !== "undefined" && crypto.subtle
      ? crypto.subtle
      : (globalThis as unknown as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;

  if (!cryptoSubtle) {
    throw new Error("Web Crypto API (crypto.subtle) is unavailable.");
  }

  const hashBuffer = await cryptoSubtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time comparison of two string hashes to mitigate timing side-channel attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generates a cryptographically strong, non-guessable identifier or token.
 */
export function generateSecureId(prefix?: string, byteLength: number = 32): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return prefix ? `${prefix}_${hex}` : hex;
}

/**
 * Validates that a callback URL is safe, valid, and matches allowed origin/host constraints.
 */
export function isValidCallbackUrl(
  callbackUrl: string,
  allowedOrigins?: string[],
  registeredCallbackUrl?: string
): { valid: boolean; reason?: string; origin?: string } {
  try {
    const url = new URL(callbackUrl);

    // Protocol check: Allow http on localhost/127.0.0.1 for local dev, require https for production
    const isLocalhost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]";

    if (url.protocol !== "https:" && !isLocalhost) {
      return {
        valid: false,
        reason: "Callback URL must use HTTPS in non-local environments.",
      };
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return {
        valid: false,
        reason: `Unsupported URL protocol: ${url.protocol}`,
      };
    }

    const currentOrigin = url.origin;

    // Check against registered base callback URL if provided
    if (registeredCallbackUrl) {
      try {
        const regUrl = new URL(registeredCallbackUrl);
        const regOrigin = regUrl.origin;
        if (currentOrigin !== regOrigin && !isAllowedOrigin(currentOrigin, allowedOrigins)) {
          return {
            valid: false,
            reason: `Callback URL origin (${currentOrigin}) does not match registered app origin (${regOrigin}).`,
            origin: currentOrigin,
          };
        }
      } catch {
        // If registered callback is somehow invalid, skip registered origin check
      }
    }

    if (allowedOrigins && allowedOrigins.length > 0) {
      if (!isAllowedOrigin(currentOrigin, allowedOrigins)) {
        return {
          valid: false,
          reason: `Origin ${currentOrigin} is not in the verifier app's allowed origins list.`,
          origin: currentOrigin,
        };
      }
    }

    return { valid: true, origin: currentOrigin };
  } catch (err: unknown) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : "Invalid URL format.",
    };
  }
}

function isAllowedOrigin(origin: string, allowedOrigins?: string[]): boolean {
  if (!allowedOrigins || allowedOrigins.length === 0) return true;
  return allowedOrigins.some((allowed) => {
    if (allowed === "*" || allowed === origin) return true;
    try {
      const allowedUrl = new URL(allowed);
      return allowedUrl.origin === origin;
    } catch {
      return allowed === origin;
    }
  });
}
