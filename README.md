# Reclaim Protocol Next.js & Fastify Demo

This project demonstrates how to securely integrate the `@reclaimprotocol/js-sdk` across a Next.js frontend and a Fastify backend. It serves as an educational template to help developers understand the recommended architecture for robust, production-ready zero-knowledge proofs.

## 🌟 Overview

When building applications with Reclaim Protocol, it is crucial to handle cryptographic secrets safely and verify data integrity mathematically. This demo application showcases:

1. **Secure Session Initialization**: Generating proof request configurations on a protected backend to ensure the `APP_SECRET` is never exposed to the client.
2. **Frontend UI Handling**: Reconstructing the proof request via the client-side SDK and managing the verification flow (e.g., QR codes and deep links).
3. **Cryptographic Validation**: Transmitting the generated proofs back to the backend natively processing the verifications against Reclaim’s signatures to prevent tampering and spoofing.

## 🏗 Architecture

The demo relies on a decoupled architecture for maximum security:

- **Frontend (Next.js)**: Orchestrates the user experience. It queries your backend to initialize a Reclaim proof safely and handles the user interface updates.
- **Backend (Fastify)**: Responsible for mathematically creating the required configurations and verifying resulting signatures. It interacts with the Reclaim network securely using your private application credentials.

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed along with a package manager (`npm`, `yarn`, or `pnpm`). You will also need your credentials from the [Reclaim Developer Portal](https://dev.reclaimprotocol.org/).

### 1. Setup Environment Variables

In the root of this project, you will find a `.env.example` file. Make a copy of it labeled `.env` and fill in the required variables.

```sh
cp .env.example .env
```

Ensure your `.env` contains:
```env
RECLAIM_APP_ID="your-app-id-here"
RECLAIM_APP_SECRET="your-app-secret-here"
```

### 2. Run the Backend

Navigate to the `backend` directory, install dependencies, and start the development server.

```sh
cd backend
npm install
npm run dev
```

The Fastify server will spin up on `http://localhost:8080`.

### 3. Run the Frontend

In a separate terminal window, open the `frontend` directory, install its dependencies, and start the frontend application.

```sh
cd frontend
npm install
npm run dev
```

The Next.js application will be accessible at `http://localhost:3000`.

## 📚 Code Walkthrough

We recommend exploring the following files to deeply understand the implementation:

- `backend/src/reclaimService.ts`: Contains the `createProofRequest` and `verifyProofResponse` implementations. Notice how the secret key is utilized to generate configurations, and how cryptographical proofs are subsequently processed.
- `frontend/src/components/HRPortal.tsx`: Showcases the `startVerification` function. It illustrates how the frontend safely acquires configurations, instantiates a `ReclaimProofRequest`, and triggers user-facing Reclaim logic dynamically.

## 🔒 Security Best Practices

1. **Never leak your App Secret**: This repository strictly limits `APP_SECRET` usage to the backend context.
2. **Always verify & validate proofs**: Client-side proof responses can be spoofed by a maliciously modified client device. The `verifyProofResponse` endpoint uses verifyProof from @reclaimprotocol/js-sdk to cryptographically verify and validate the proof to ensure the payload has not been intercepted, spoofed, or modified.

## 🔗 Resources

- [Reclaim Protocol Documentation](https://docs.reclaimprotocol.org/)
- [Developer Portal](https://dev.reclaimprotocol.org/)
