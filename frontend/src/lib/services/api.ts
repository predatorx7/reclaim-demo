/**
 * getReclaimConfig
 *
 * Fetches the pre-signed JSON string of the requested Provider identity.
 * We MUST ask our backend to initialize the ReclaimProofRequest securely because
 * the backend is the only entity that safely holds our APP_SECRET.
 *
 * @param provider The provider id to verify (e.g. 'razorpay')
 */
export const getReclaimConfig = async (provider: string) => {
  const response = await fetch(
    `http://localhost:8080/request-config?provider=${provider}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch request config");
  }
  return response.json();
};

/**
 * verifyProofResponse
 *
 * Sends the successful proof object yielded by Reclaim to the backend.
 * The backend mathematically verifies the crypto-signatures native to the protocol
 * to ensure that the user completed the flow successfully without tampering
 * with the generated HTTP proofs.
 *
 * @param proof The mathematical proof payload given by Reclaim
 */
export const verifyProofResponse = async (sessionId: string, proof: any) => {
  const response = await fetch(
    `http://localhost:8080/verify-proof?sessionId=${sessionId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ proof }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to verify proof");
  }
  return response.json();
};
