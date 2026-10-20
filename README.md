<!-- # Verifi

**Your Identity. Your Credentials. Your Control.**

Verifi is a privacy-preserving digital identity and verifiable credential platform that lets users control and securely share their verified identity information using self-sovereign identity principles, verifiable credentials, and cryptographic proofs.

> **Important Project Rule**: Verifi strictly uses **real data and real working integrations**. It does not use mock data, fake users, simulated blockchain transactions, or placeholder verification results. When an integration is not yet connected, the architecture outlines the real connection requirements rather than simulating responses.

---

## 1. What Verifi Is

Verifi is a decentralized, privacy-focused identity platform designed to empower individuals with full sovereignty over their identity data. Users can hold cryptographically verifiable credentials (VCs), selectively disclose attributes, and verify claims on-chain and off-chain without exposing sensitive underlying data.

---

## 2. Current Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Authentication**: Clerk
- **Backend Database**: Convex
- **Linting & Formatting**: ESLint (`eslint-config-next`)
- **Package Manager**: npm

---

## 3. Current Project Architecture

The codebase separates frontend application concerns from backend services, database handlers, and protocol specifications:

- **Frontend (`/app`, `/components`)**: Responsive Next.js App Router user interface with reusable UI components and Light/Dark mode support.
- **Shared Utilities & Configuration (`/lib`, `/types`)**: Centralized type safety, safe environment variable access, and domain constants.
- **Backend Services (`/backend`)**: Dedicated area for identity issuance logic, signature verification, and API services.
- **Convex Database (`/convex`)**: Dedicated area for Convex reactive database schemas and server functions.
- **Documentation (`/docs`)**: Technical specifications and protocol documentation.

---

## 4. Folder Structure

```
verifi/
│
├── app/
│   ├── layout.tsx         # Root layout with fonts, navigation, and metadata
│   ├── page.tsx           # Verifi landing page
│   ├── dashboard/         # Authenticated User Dashboard
│   └── globals.css        # Global CSS and Tailwind styling
│
├── components/
│   ├── ui/                # Reusable UI components (button, theme toggle, etc.)
│   ├── layout/            # Layout components (navbar, footer)
│   └── dashboard/         # Dashboard panels and metrics
│
├── lib/
│   ├── config.ts          # Centralized configuration with runtime safety
│   ├── constants.ts       # Global brand and metadata constants
│   └── utils.ts           # Shared helper functions
│
├── types/
│   └── index.ts           # Core TypeScript types and interfaces
│
├── convex/                # Convex schemas and backend functions
├── backend/               # Backend protocol services
├── docs/                  # Technical docs & specifications
│
├── .env.example           # Environment variable template
├── .gitignore             # Git ignore rules (protects local credentials)
├── README.md              # Project documentation
├── package.json           # Package configuration & scripts
├── tsconfig.json          # TypeScript compiler configuration
└── next.config.ts         # Next.js configuration
```

---

## 5. How to Install Dependencies

Run the following command in the project root:

```bash
npm install
```

---

## 6. How to Run Locally

Start the local development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 7. Environment Variable Setup

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Configure Clerk and Convex credentials in `.env.local`. -->

# Verifi 🔐
### Your Identity. Your Credentials. Your Control.

**Verifi** is a privacy-focused digital identity and verifiable credential platform designed to give individuals greater control over how their identity information is verified and shared.

Built around self-sovereign identity principles, Verifi aims to make digital verification more secure, transparent, and privacy-preserving.

Verifi also explores **TinyFish-powered web automation** to support trusted online workflows around identity verification, issuer discovery, and verification-related information gathering.

> **Core principle:** Real data, real integrations, and transparent verification. No fake users, mock verification results, or simulated blockchain transactions presented as real.

---

## 🚀 Live Project

- **Live Demo:** https://verifi-gray.vercel.app
- **GitHub Repository:** https://github.com/Pranav0331/verifi
- **Hackathon:** Kritikal Hacks 2026

---

## 💡 The Problem

Online identity verification often requires users to repeatedly submit personal information and documents to different platforms.

This can create several challenges:

- Repeated identity verification across different services.
- Unnecessary exposure of sensitive personal information.
- Difficulty establishing trust in digital credentials.
- Limited transparency about credential issuers and verification processes.
- Manual effort when gathering information from online sources.

## 🎯 Our Solution

Verifi aims to provide a platform where users can manage digital identity credentials and share verified information with greater control.

The platform combines identity management, verifiable credential concepts, cryptographic verification, and blockchain-related capabilities.

With TinyFish, we are exploring how web automation can support verification-related workflows by retrieving relevant information from online sources and reducing repetitive manual research.

The goal is to make digital trust easier to establish without compromising user privacy.

---

## ✨ Key Capabilities

### 1. Digital Identity Management
A central place for users to manage their digital identity and credential-related information.

### 2. Verifiable Credentials
A framework for representing digitally verifiable claims issued by trusted authorities.

### 3. Privacy-Preserving Verification
An approach that aims to minimize unnecessary disclosure of personal information during verification.

### 4. Issuer and Verifier Workflows
Support for workflows involving credential issuers, credential holders, and parties requesting verification.

### 5. Cryptographic Verification
Exploration of cryptographic signatures and proofs to help establish credential authenticity and integrity.

### 6. Blockchain Integration
Blockchain-related components for supported on-chain operations, subject to the configured network and deployed contract.

### 7. TinyFish-Powered Web Automation
TinyFish is the web automation component we are exploring for Verifi.

Potential applications include:
- Gathering issuer-related information from permitted online sources.
- Automating repetitive verification-support workflows.
- Retrieving relevant information for review by authorized users.
- Reducing manual navigation across online resources.

**Important:** Web automation supports the workflow; it does not independently prove that a person's identity or credential is genuine. Verification must rely on trusted issuers, cryptographic checks, and authoritative evidence.

---

## 🐟 How TinyFish Fits into Verifi

TinyFish is being explored as an automation layer that can interact with websites and retrieve information required by supported workflows.

### Proposed workflow

1. **Start a workflow:** An authorized user initiates a supported verification-related task.
2. **Send the request securely:** The backend prepares the required task and calls the TinyFish integration.
3. **Perform web automation:** TinyFish carries out the configured website interaction and information-gathering workflow.
4. **Validate the response:** The backend checks the returned information, handles failures, and validates the data according to the workflow's requirements.
5. **Review the results:** Relevant information is presented to the user for review.
6. **Verify credentials separately:** Credential authenticity is established through the appropriate trusted issuer, signature, proof, or other authoritative verification mechanism.
7. **Record the outcome:** Where implemented, the application records the workflow result and relevant audit information.

### Integration principles

- TinyFish credentials must remain on the server.
- Automation results must not automatically be treated as verified identities.
- Failed, incomplete, or unavailable results must be reported transparently.
- Sensitive identity information should not be sent to third-party automation services unless necessary and appropriately authorized.
- External websites must be accessed in accordance with their permissions and applicable policies.

**Integration status:** The workflow above describes the intended integration design. Confirm that the corresponding backend calls, credentials, validation, and error handling are implemented before presenting the complete workflow as operational.

---

## 🏗️ Technology Stack

| Technology | Purpose |
|---|---|
| Next.js App Router | Web application and routing |
| TypeScript | Type-safe application development |
| React | User interface |
| Tailwind CSS | Styling and responsive layouts |
| Clerk | Authentication and user management |
| Convex | Reactive database and backend functions |
| Solidity / Hardhat | Smart contract development tooling |
| Ethers.js | Blockchain interaction |
| SimpleWebAuthn | WebAuthn-related functionality |
| TinyFish | Web automation integration |
| ESLint | Code quality and linting |
| npm | Package management |

The availability of a dependency does not by itself mean that its corresponding feature is fully implemented or deployed.

---

## 🧩 System Architecture

Verifi separates the user interface, authentication, backend processing, database operations, and external integrations.

### Frontend
Located in `app/` and `components/`.

Responsible for:
- Landing page and navigation.
- Authentication screens.
- User dashboard.
- Credential-related interfaces.
- Displaying workflow status and verification results.

### Authentication
Clerk manages the configured authentication flow.

Protected operations should verify the user's identity and permissions on the server, rather than relying only on frontend checks.

### Backend
The `backend/` directory contains the project's backend-related services and protocol logic.

It is the appropriate boundary for sensitive external integrations, including TinyFish API credentials and server-side request handling.

### Database
Convex provides the application's reactive database and backend function infrastructure.

It can store application records and workflow metadata according to the implemented schema and access rules.

### Blockchain Layer
The blockchain-related components support configured smart contract interactions.

Actual network operations depend on the deployed contract, configured network, RPC endpoint, and valid credentials.

### TinyFish Integration Layer
TinyFish should be called through a server-side integration rather than directly from browser code.

The backend should validate inputs, protect credentials, handle errors, and return only the information needed by the frontend.

---

## 📁 Project Structure

```text
verifi/
├── app/                 # Next.js routes and pages
├── components/          # Reusable UI components
├── backend/             # Backend and integration services
├── convex/              # Convex schemas and functions
├── contracts/           # Blockchain-related contracts
├── docs/                # Technical documentation
├── lib/                 # Shared utilities and configuration
├── public/               # Static assets
├── scripts/              # Project scripts
├── types/                # Shared TypeScript types
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore rules
├── middleware.ts         # Request middleware
├── next.config.ts        # Next.js configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # Project documentation
```

---

## ⚙️ Installation and Setup

### Prerequisites

Install the following:

- Node.js compatible with the project's Next.js version.
- npm.
- Git.
- Required Clerk and Convex accounts for the configured authentication and backend services.
- Additional credentials only for integrations you intend to run.

### 1. Clone the repository

```bash
git clone https://github.com/Pranav0331/verifi.git
cd verifi
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create your local environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and configure the credentials required by your enabled integrations.

Typical existing configuration includes:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CONVEX_URL`
- Blockchain configuration, if required by the feature being tested.
- TrustID API configuration, if that integration is enabled.

For TinyFish, add the API credentials and endpoint variables required by your actual backend integration and the official TinyFish API documentation. Do not assume that a variable is supported until the backend code reads it.

**Security rules:**
- Never commit `.env.local`.
- Never expose private API keys through `NEXT_PUBLIC_` variables.
- Never place blockchain private keys in frontend code.
- Use separate environment variables for local development and production.

### 4. Start the development server

```bash
npm run dev
```

Open:

http://localhost:3000

### 5. Run the production build

```bash
npm run build
```

### 6. Run lint checks

```bash
npm run lint
```

---

## 🔐 Privacy and Security

Identity-related systems must treat personal information as sensitive.

Verifi follows these design principles:

- **Data minimization:** Collect and disclose only the information required for a workflow.
- **Authentication:** Restrict protected operations to authenticated users.
- **Authorization:** Validate permissions on the server.
- **Credential integrity:** Use appropriate cryptographic verification for supported credentials.
- **Secret management:** Keep API keys and private keys on the server.
- **External service boundaries:** Send only necessary information to third-party services.
- **Transparent failures:** Never present an unavailable verification service as a successful verification.
- **Auditability:** Record relevant events where audit logging is implemented.

Zero-knowledge proofs and selective disclosure should only be described as operational features when the corresponding cryptographic implementation has been completed and tested.

---

## 🧪 Testing and Reliability

Before deploying a feature, verify:

- Authentication and protected routes.
- Server-side authorization.
- Credential validation and invalid-signature handling.
- Database access restrictions.
- Blockchain network and transaction errors, where applicable.
- TinyFish authentication, timeouts, unsuccessful requests, and malformed responses.
- Missing environment variables.
- Loading, empty, and error states.
- Production build and lint checks.

External integration failures must produce a clear error or unavailable status rather than fabricated success responses.

---

## 🌐 Deployment

Verifi can be deployed to a compatible hosting platform such as Vercel.

For deployment:

1. Import the GitHub repository into the hosting platform.
2. Configure the required production environment variables.
3. Configure Clerk and Convex for the production environment.
4. Configure any required blockchain or external service credentials.
5. Configure TinyFish server-side credentials only if its backend integration is implemented.
6. Run the production build.
7. Test authentication, database access, and every enabled external integration.
8. Confirm that secrets are not exposed in browser bundles or logs.

Live deployment does not automatically mean every documented integration is operational. Test each integration independently.

---

## 🗺️ Development Roadmap

- [ ] Strengthen digital identity and credential management.
- [ ] Complete and test credential issuance and verification workflows.
- [ ] Implement privacy-preserving disclosure where supported.
- [ ] Validate deployed smart contract interactions.
- [ ] Integrate TinyFish into a defined verification-support workflow.
- [ ] Add backend validation, timeout handling, and secure error reporting for TinyFish.
- [ ] Add appropriate workflow audit records.
- [ ] Expand automated tests for security and reliability.
- [ ] Document verified end-to-end integration results.

Roadmap items should be marked complete only after implementation and testing.

---

## 🤝 Contributing

Contributions, suggestions, and feedback are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement and test your changes.
4. Submit a pull request describing the change.

Please avoid committing secrets, personal identity documents, or real user data.

---

## 👨‍💻 Project

**Verifi — Your Identity. Your Credentials. Your Control.**

Built for Kritikal Hacks 2026, with TinyFish as the web automation technology we are exploring for the project.

- **Developer:** Pranav Mathur
- **Repository:** https://github.com/Pranav0331/verifi
- **Live application:** https://verifi-gray.vercel.app

---

## 📄 License

Add a `LICENSE` file before declaring a specific open-source license for this project.
