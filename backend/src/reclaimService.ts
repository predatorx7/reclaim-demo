import { ReclaimProofRequest, verifyProof } from "@reclaimprotocol/js-sdk";
import providerConfig from "../provider_config.json";

// Type guard to ensure the requested provider matches the available configurations.
export const isKnownProviderRequest = <T extends string>(
  request: any,
  config: Record<T, any>,
): request is T => {
  return typeof request === "string" && request in config;
};

const requestedProviderBySessionIdCache = new Map<string, string>();

/**
 * Initializes the ReclaimProofRequest on the backend.
 *
 * The ReclaimProofRequest.init() method requires your application's APP_SECRET.
 * It is essential that this secret remains secure on your backend rather than
 * being exposed in the frontend code. This endpoint generates the session
 * configuration, serializes it to a JSON format, and securely passes it to
 * the frontend client to initiate the verification process.
 */
export const createProofRequest = async (request: any, reply: any) => {
  try {
    const APP_ID = process.env.RECLAIM_APP_ID;
    const APP_SECRET = process.env.RECLAIM_APP_SECRET;
    const requestedProvider = request.query?.provider;

    // Validate the requested provider against the known provider configurations you want to use.
    if (!isKnownProviderRequest(requestedProvider, providerConfig)) {
      return reply.status(400).send({
        error: "Unknown verification request",
      });
    }

    const reclaimProviderConfig = providerConfig[requestedProvider].reclaim;

    console.log(
      `Initializing Proof Request for Provider: ${reclaimProviderConfig.provider_id}`,
    );

    // Initialize the ReclaimProofRequest using the application credentials
    // and the specific provider's ID.
    const reclaimProofRequest = await ReclaimProofRequest.init(
      APP_ID as string,
      APP_SECRET as string,
      reclaimProviderConfig.provider_id,
      {
        providerVersion: reclaimProviderConfig.provider_version,
      },
    );

    requestedProviderBySessionIdCache.set(
      reclaimProofRequest.getSessionId(),
      requestedProvider,
    );

    // Serialize the complete request configuration to a JSON string.
    const config = reclaimProofRequest.toJsonString();

    // Transmit the configuration to the frontend application to commence the verification flow.
    return reply.send({
      reclaimProofRequestConfig: config,
    });
  } catch (err) {
    console.error("Failed to initialize proof request:", err);
    return reply.status(500).send({
      error: "Failed to create proof request",
    });
  }
};

/**
 * Verifies the validity of the proof received from the frontend.
 *
 * After the end-user concludes the Reclaim verification protocol, the generated
 * proof is transmitted to the backend. The backend utilizes the SDK's `verifyProof`
 * function to mathematically validate the cryptographic signatures. This ensures
 * that the relayed proof originated from legitimate attestors and has not been altered.
 */
export const verifyProofResponse = async (request: any, reply: any) => {
  try {
    const sessionId = request.query.sessionId;
    const requestedProvider = requestedProviderBySessionIdCache.get(sessionId);

    if (!requestedProvider) {
      return reply.status(400).send({
        error: "Unknown session.",
      });
    }
    if (!isKnownProviderRequest(requestedProvider, providerConfig)) {
      return reply.status(400).send({
        error: "Unknown verification request",
      });
    }
    const reclaimProviderConfig = providerConfig[requestedProvider].reclaim;

    const proofs = request.body.proof;
    console.log("Verifying received proofs...");

    // Submit the proof payload to the JavaScript SDK's verifyProof function.
    // In this demonstration, content validation constraints are disabled.
    // In a production environment, you should enforce strict validation.
    const result = await verifyProof(proofs, {
      providerId: reclaimProviderConfig.provider_id,
      providerVersion: reclaimProviderConfig.provider_version,
    });

    // Ensure the proof is authentic and cryptographically valid.
    if (!result.isVerified) {
      console.warn("Cryptographic verification failed!", result);
      return reply.status(400).send({
        error: "Proof verification failed.",
        result,
      });
    }

    // After successful verification, finalize the transaction.
    // At this stage, the verified data can be logged, stored in a database,
    // or used to issue a verifiable token (e.g., JWT).
    return reply.send({ verified: true, result });
  } catch (err) {
    console.error("Error during proof verification execution:", err);
    return reply.status(500).send({
      error: "Proof verification failed",
    });
  }
};
