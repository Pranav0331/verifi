/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as blockchain from "../blockchain.js";
import type * as credentials from "../credentials.js";
import type * as integrations from "../integrations.js";
import type * as lib_apiAuth from "../lib/apiAuth.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_vcVerifier from "../lib/vcVerifier.js";
import type * as passkeys from "../passkeys.js";
import type * as qr from "../qr.js";
import type * as roleRequests from "../roleRequests.js";
import type * as users from "../users.js";
import type * as verifications from "../verifications.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  blockchain: typeof blockchain;
  credentials: typeof credentials;
  integrations: typeof integrations;
  "lib/apiAuth": typeof lib_apiAuth;
  "lib/auth": typeof lib_auth;
  "lib/vcVerifier": typeof lib_vcVerifier;
  passkeys: typeof passkeys;
  qr: typeof qr;
  roleRequests: typeof roleRequests;
  users: typeof users;
  verifications: typeof verifications;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
