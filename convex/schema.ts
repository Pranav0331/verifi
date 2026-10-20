import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const UserRole = v.union(
  v.literal("user"),
  v.literal("issuer"),
  v.literal("verifier"),
  v.literal("admin")
);

export const RoleRequestStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
);

export const RequestedRole = v.union(
  v.literal("issuer"),
  v.literal("verifier")
);

export const CredentialStatus = v.union(
  v.literal("active"),
  v.literal("revoked")
);

export const VerificationResult = v.union(
  v.literal("VERIFIED"),
  v.literal("INVALID"),
  v.literal("REVOKED"),
  v.literal("EXPIRED")
);

export const AnchorStatus = v.union(
  v.literal("PENDING"),
  v.literal("ANCHORED"),
  v.literal("FAILED")
);

export const VerificationSessionStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("verified"),
  v.literal("rejected"),
  v.literal("expired")
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    username: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: UserRole,
    onboardingCompleted: v.optional(v.boolean()),
    did: v.optional(v.string()),
    publicKey: v.optional(v.string()),
    keyType: v.optional(v.string()),
    didCreatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_did", ["did"]),

  roleRequests: defineTable({
    userId: v.id("users"),
    clerkId: v.string(),
    requestedRole: RequestedRole,
    organizationName: v.string(),
    organizationType: v.optional(v.string()),
    website: v.optional(v.string()),
    contactEmail: v.string(),
    useCaseDescription: v.string(),
    status: RoleRequestStatus,
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_clerkId", ["clerkId"])
    .index("by_status", ["status"]),

  credentials: defineTable({
    credentialId: v.string(), // e.g. urn:uuid:...
    type: v.array(v.string()), // ["VerifiableCredential", "EmploymentCredential", ...]
    issuerDid: v.string(), // did:key:z...
    issuerName: v.string(), // Organization or Authority Name
    issuerUserId: v.id("users"),
    recipientDid: v.string(), // did:key:z...
    recipientUserId: v.id("users"),
    credentialData: v.any(), // Structured claims
    issuedAt: v.number(),
    expirationDate: v.optional(v.number()),
    status: CredentialStatus,
    revokedAt: v.optional(v.number()),
    revocationReason: v.optional(v.string()),
    rawVcJson: v.string(), // Complete signed W3C JSON string
    proof: v.object({
      type: v.string(),
      created: v.string(),
      proofPurpose: v.string(),
      verificationMethod: v.string(),
      jws: v.string(),
    }),
    // Blockchain Sepolia Anchoring Fields
    blockchainAnchorStatus: v.optional(AnchorStatus),
    blockchainTxHash: v.optional(v.string()),
    blockchainBlockNumber: v.optional(v.number()),
    blockchainCredentialHash: v.optional(v.string()),
    blockchainAnchoredAt: v.optional(v.number()),
    blockchainContractAddress: v.optional(v.string()),
    blockchainNetwork: v.optional(v.string()),
    blockchainFailureReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_credentialId", ["credentialId"])
    .index("by_recipientDid", ["recipientDid"])
    .index("by_recipientUserId", ["recipientUserId"])
    .index("by_issuerDid", ["issuerDid"])
    .index("by_issuerUserId", ["issuerUserId"])
    .index("by_status", ["status"])
    .index("by_blockchainStatus", ["blockchainAnchorStatus"]),

  blockchainAnchors: defineTable({
    credentialDocId: v.id("credentials"),
    credentialId: v.string(),
    credentialHash: v.string(), // 32-byte hex string (0x...)
    network: v.string(), // "sepolia"
    chainId: v.number(), // 11155111
    contractAddress: v.string(),
    transactionHash: v.optional(v.string()),
    blockNumber: v.optional(v.number()),
    anchoredAt: v.optional(v.number()),
    anchoredByUserId: v.id("users"),
    anchoredByClerkId: v.string(),
    status: AnchorStatus,
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_credentialDocId", ["credentialDocId"])
    .index("by_credentialId", ["credentialId"])
    .index("by_credentialHash", ["credentialHash"])
    .index("by_status", ["status"]),

  verifications: defineTable({
    verifierUserId: v.id("users"),
    verifierClerkId: v.string(),
    verifierRole: UserRole,
    credentialId: v.string(),
    credentialDocId: v.optional(v.id("credentials")),
    credentialType: v.array(v.string()),
    issuerDid: v.string(),
    issuerName: v.string(),
    recipientDid: v.string(),
    result: VerificationResult,
    signatureValid: v.boolean(),
    integrityValid: v.boolean(),
    statusValid: v.boolean(),
    expirationValid: v.boolean(),
    failureReason: v.optional(v.string()),
    claimsSummary: v.optional(v.any()),
    // Blockchain Verification Results
    blockchainAnchored: v.optional(v.boolean()),
    blockchainCredentialHash: v.optional(v.string()),
    blockchainContractAddress: v.optional(v.string()),
    blockchainTxHash: v.optional(v.string()),
    blockchainBlockNumber: v.optional(v.number()),
    blockchainNetwork: v.optional(v.string()),
    blockchainAnchoredAt: v.optional(v.number()),
    verifiedAt: v.number(),
  })
    .index("by_verifierUserId", ["verifierUserId"])
    .index("by_credentialId", ["credentialId"])
    .index("by_recipientDid", ["recipientDid"])
    .index("by_result", ["result"])
    .index("by_verifiedAt", ["verifiedAt"]),

  qrShareTokens: defineTable({
    token: v.string(), // Secure, non-guessable 32-byte hex token
    credentialDocId: v.id("credentials"),
    credentialId: v.string(),
    holderUserId: v.id("users"),
    holderClerkId: v.string(),
    expiresAt: v.number(), // Timestamp in ms
    status: v.union(
      v.literal("active"),
      v.literal("used"),
      v.literal("revoked"),
      v.literal("expired")
    ),
    useCount: v.number(),
    maxUses: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_credentialDocId", ["credentialDocId"])
    .index("by_holderUserId", ["holderUserId"])
    .index("by_status", ["status"]),

  passkeys: defineTable({
    credentialId: v.string(), // Base64URL credential ID
    publicKey: v.string(), // Base64URL encoded public key
    counter: v.number(),
    deviceType: v.string(), // 'singleDevice' | 'multiDevice'
    backedUp: v.boolean(),
    transports: v.optional(v.array(v.string())),
    userId: v.id("users"),
    clerkId: v.string(),
    userEmail: v.optional(v.string()),
    userName: v.optional(v.string()),
    deviceName: v.optional(v.string()),
    aaguid: v.optional(v.string()),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revoked: v.optional(v.boolean()),
  })
    .index("by_credentialId", ["credentialId"])
    .index("by_userId", ["userId"])
    .index("by_clerkId", ["clerkId"]),

  webauthnChallenges: defineTable({
    challenge: v.string(),
    clerkId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    purpose: v.union(v.literal("registration"), v.literal("authentication")),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_challenge", ["challenge"])
    .index("by_clerkId", ["clerkId"]),

  verifierApps: defineTable({
    name: v.string(),
    clientId: v.string(), // Unique client ID: vapp_...
    hashedApiKey: v.string(), // SHA-256 hash of the API key
    callbackUrl: v.string(), // Default registered callback URL
    active: v.boolean(), // Active status
    description: v.optional(v.string()),
    allowedOrigins: v.optional(v.array(v.string())), // Allowed domain origins for CORS / redirect
    ownerUserId: v.optional(v.id("users")), // Creator or admin user
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clientId", ["clientId"])
    .index("by_active", ["active"]),

  verificationSessions: defineTable({
    sessionId: v.string(), // Secure, non-guessable 32-byte hex ID: vsess_...
    verifierAppId: v.id("verifierApps"),
    requestedClaims: v.array(v.string()), // e.g. ["name", "email", "role"]
    requestedCredentialType: v.optional(v.string()), // e.g. "EmploymentCredential"
    status: VerificationSessionStatus, // "pending" | "approved" | "verified" | "rejected" | "expired"
    userId: v.optional(v.id("users")), // User who authenticated & approved
    credentialId: v.optional(v.string()), // ID of the credential presented
    credentialDocId: v.optional(v.id("credentials")), // Document reference in credentials table
    callbackUrl: v.string(), // Specific callback URL for this session
    nonce: v.optional(v.string()), // Nonce for replay prevention
    metadata: v.optional(v.any()), // Extra metadata passed by verifier app
    verificationResult: v.optional(VerificationResult), // "VERIFIED" | "INVALID" | "REVOKED" | "EXPIRED"
    failureReason: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    expiresAt: v.number(), // Short-lived expiration timestamp (ms)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_verifierAppId", ["verifierAppId"])
    .index("by_status", ["status"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_userId", ["userId"]),
});
