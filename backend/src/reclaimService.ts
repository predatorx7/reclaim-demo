import { ReclaimProofRequest, verifyProof } from "@reclaimprotocol/js-sdk";
import providerConfig from "../provider_config.json";

export const isKnownProviderRequest = <T extends string>(request: any, config: Record<T, any>): request is T => {
  return typeof request === 'string' && request in config;
}

/**
 * createProofRequest
 * 
 * Securely initializes the `ReclaimProofRequest` on the backend.
 * 
 * 💡 WHY BACKEND?
 * The `ReclaimProofRequest.init()` method requires your Reclaim `APP_SECRET`.
 * You should never expose your `APP_SECRET` on a public frontend application!
 * Instead, we generate the session configuration on this protected backend,
 * serialize it to a JSON blob, and pass it securely to the frontend.
 */
export const createProofRequest = async (request: any, reply: any) => {
  try {
    const APP_ID = process.env.RECLAIM_APP_ID;
    const APP_SECRET = process.env.RECLAIM_APP_SECRET;
    const requestedProvider = request.query?.provider;

    if (!isKnownProviderRequest(requestedProvider, providerConfig)) {
      return reply.status(400).send({
        error: "Unknown verification request"
      });
    }

    // We can allow the frontend to specify a dynamic provider (e.g. HR portals, banks), 
    // or fallback to the one defined in our environment variables.
    const reclaimProviderConfig = providerConfig[requestedProvider].reclaim;

    console.log(`[Backend] Initializing Proof Request for Provider: ${reclaimProviderConfig.provider_id}`);

    // Step 1: Initialize the request with the secret credentials
    const reclaimProofRequest = await ReclaimProofRequest.init(
      APP_ID as string,
      APP_SECRET as string,
      reclaimProviderConfig.provider_id,
      {
        providerVersion: reclaimProviderConfig.provider_version
      }
    );

    // Step 2: Serialize the entire configuration to JSON
    const config = reclaimProofRequest.toJsonString();

    // Step 3: Send it to the frontend client so they can start the verification flow
    return reply.send({
      reclaimProofRequestConfig: config
    });

  } catch (err) {
    console.error("[Backend] Failed to initialize proof request:", err);
    return reply.status(500).send({
      error: "Failed to create proof request"
    });
  }
};


/**
 * verifyProofResponse
 * 
 * Receives the generated proof from the frontend after the user completes the flow.
 * We mathematically verify the proof signatures against the Reclaim protocol natively.
 * 
 * 💡 WHY VERIFY AGAIN?
 * Frontend data can easily be spoofed! The backend MUST mathematically verify that the
 * proof sent by the user actually originated from Reclaim protocol attestors and hasn't
 * been tampered with.
 */
export const verifyProofResponse = async (request: any, reply: any) => {
  try {
    const proofs = request.body.proof;
    console.log("[Backend] Verifying received proofs...");

    // Step 1: Pass the proof payload to the JS SDK's `verifyProof` function
    // Note: We bypass strict configuration checking in this demo for simplicity, 
    // but in production you should validate against provider constraints.
    const result = await verifyProof(proofs, { dangerouslyDisableContentValidation: true });

    // Step 2: Act on the verification result
    if (!result.isVerified) {
      console.warn("[Backend] Cryptographic verification failed!", result);
      return reply.status(400).send({
        error: "Proof verification failed.",
        result,
      });
    }

    // Step 4: Finalize the backend transaction
    // You could save this data to your database, log it, or issue a verifiable JWT.
    return reply.send({ verified: true, result });

  } catch (err) {
    console.error("[Backend] Error during proof verification execution:", err);
    return reply.status(500).send({
      error: "Proof verification failed"
    });
  }
};