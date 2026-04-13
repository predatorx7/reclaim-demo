"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { getReclaimConfig, verifyProofResponse } from "@/lib/services/api";

const HR_PROVIDERS = [{ id: "examplepayroll", name: "Example Payroll" }];

export default function HRPortal({ next }: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [responseData, setResponseData] = useState<any>(null);
  const [verificationStep, setVerificationStep] = useState<
    "choice" | "verifying" | "completed"
  >("choice");
  const [selectedProvider, setSelectedProvider] = useState<string>(
    HR_PROVIDERS[0].id,
  );
  const configUpdateTokenRef = useRef<object>(new Object());
  const reclaimProofRequestRef = useRef<ReclaimProofRequest | undefined>(
    undefined,
  );

  const updateReclaimProofRequest = useCallback(
    async (selectedProvider: string, configToken: object) => {
      // 1. Fetch the Session Configuration Securely.
      // The Reclaim APP_SECRET must never be exposed to the client application.
      // Therefore, the backend generates the ReclaimProofRequest configuration
      // utilizing the secret and transmits it securely to the frontend.
      const configResponse = await getReclaimConfig(selectedProvider);

      if (!configResponse || !configResponse.reclaimProofRequestConfig) {
        throw new Error("Invalid configuration response received from backend");
      }

      const { reclaimProofRequestConfig } = configResponse;

      // 2. Reconstruct the Proof Request.
      // The frontend parses the serialized session configuration provided by the
      // backend into a functional `ReclaimProofRequest` instance. This allows the
      // client-side SDK to mediate the user interface flow properly.
      const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(
        reclaimProofRequestConfig,
      );

      if (configToken !== configUpdateTokenRef.current) {
        return;
      }

      reclaimProofRequestRef.current = reclaimProofRequest;
    },
    [],
  );

  /// Create request in advance to prevent popup block by browser
  useEffect(() => {
    updateReclaimProofRequest(selectedProvider, configUpdateTokenRef.current);
    return () => {
      configUpdateTokenRef.current = new Object();
    };
  }, [selectedProvider, updateReclaimProofRequest]);

  /**
   * Initiates the Reclaim Protocol Verification Flow.
   *
   * This method coordinates the core Reclaim integration process.
   * It securely retrieves the expected session configuration from the backend,
   * initializes the frontend SDK, and manages the cryptographic verification lifecycle.
   */
  const startVerification = useCallback(async () => {
    console.log("Starting verification process...");
    setErrorMessage("");
    setResponseData(null);
    setVerificationStep("verifying");
    setIsLoading(true);

    try {
      // Using request we created in advance to prevent popup blocks
      const reclaimProofRequest = reclaimProofRequestRef.current!;

      // 3. Trigger the User Interface.
      // Invoking triggerReclaimFlow displays the verification modal or QR code.
      // It returns a handle that allows the application to programmatically close
      // the visual interface once the verification protocol concludes.
      const flowHandle = await reclaimProofRequest.triggerReclaimFlow();

      // 4. Set Up the Asynchronous Session Listeners.
      // The startSession method polls the Reclaim network for updates and executes
      // the corresponding callbacks when the user completes or cancels the verification flow.
      await reclaimProofRequest.startSession({
        onSuccess: async (proofs) => {
          try {
            console.log("Raw protocol proofs received:", proofs);

            // Programmatically close the verification modal/QR code interface.
            flowHandle?.close();

            if (!proofs) {
              throw new Error("Proof payload unexpectedly empty");
            }

            const sessionId = reclaimProofRequest.getSessionId();

            // 5. Transmit the Proof for Verification to your backend.
            // When the SDK returns a proof, the frontend transmits it to the backend.
            // The backend must use verifyProof from @reclaimprotocol/js-sdk to cryptographically verify and validate the proof to ensure
            // the payload has not been intercepted, spoofed, or modified.
            const result = await verifyProofResponse(sessionId, proofs);

            // Upon successful backend verification, the flow is considered complete.
            setResponseData(result);
            setVerificationStep("completed");
          } catch (err) {
            setErrorMessage(
              `Error processing verification on backend: ${String(err)}`,
            );
            setVerificationStep("choice");
          } finally {
            setIsLoading(false);
          }
        },

        onError: (error) => {
          console.error("SDK verification cancelled or errored:", error);
          setErrorMessage(
            `Verification cancelled by the user or failed network connection.`,
          );
          setVerificationStep("choice");
          setIsLoading(false);
        },

        verificationConfig: {
          // By specifying this configuration, the local SDK session bypasses its
          // default structural assertion checking, deferring the rigorous mathematical
          // verification completely to the robust server-side verifyProof() function.
          dangerouslyDisableContentValidation: true,
        },
      });
    } catch (err) {
      console.error("Critical verification error:", err);
      setErrorMessage(`Unexpected setup error: ${String(err)}`);
      setVerificationStep("choice");
      setIsLoading(false);
    }
  }, [selectedProvider]);

  return (
    <div>
      <Card className="w-full shadow-lg rounded-2xl border-none ring-1 ring-slate-100">
        <CardHeader className="space-y-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl px-6 py-8">
          <CardTitle className="text-2xl font-bold text-white text-center">
            Employment Verification
          </CardTitle>
          <p className="text-blue-100 text-center text-sm font-medium">
            Powered securely by Reclaim SDK ⚡️
          </p>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {verificationStep === "choice" && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-2">
                  Link your HR Portal Account
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  To automatically verify your employment status, please log
                  into your payroll provider. Reclaim Protocol creates a
                  mathematically secure zero-knowledge proof locally on your
                  device without exposing your credentials.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 ml-1">
                  Select Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-60 bg-white text-slate-900 shadow-sm"
                >
                  {HR_PROVIDERS.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 shadow-sm animate-in fade-in slide-in-from-top-1">
                  <p className="text-sm font-medium text-red-800">
                    {errorMessage}
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <Button
                  onClick={startVerification}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-base font-semibold transition-all shadow-md active:scale-[0.98]"
                >
                  {isLoading ? "Starting Session..." : "Verify Securely"}
                </Button>
              </div>
            </div>
          )}

          {verificationStep === "verifying" && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
                <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                <div className="text-xl font-bold text-slate-800">
                  Interacting with Reclaim...
                </div>
                <div className="text-sm text-slate-500 text-center max-w-xs">
                  Please complete the verification dynamically in the open
                  portal or by scanning the QR code if verifying on mobile!
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-6">
                  <p className="text-sm font-medium text-red-800 text-center">
                    {errorMessage}
                  </p>
                </div>
              )}
            </div>
          )}

          {verificationStep === "completed" && (
            <div className="space-y-6 py-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 shadow-sm flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600 text-2xl font-bold">
                  ✓
                </div>
                <h4 className="font-bold text-emerald-900 mb-1 text-lg">
                  Cryptographically Verified!
                </h4>
                <p className="text-sm text-emerald-700 text-center">
                  Your employment proof has been secured and confirmed via
                  zero-knowledge proof by our backend server.
                </p>
              </div>

              {responseData && (
                <div className="bg-slate-900 rounded-xl p-5 overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                    <h4 className="font-semibold text-slate-300 text-sm tracking-wide uppercase">
                      Extracted Metadata Payload
                    </h4>
                  </div>
                  <pre className="text-xs text-green-400 overflow-x-auto whitespace-pre-wrap font-mono">
                    {JSON.stringify(responseData, null, 2)}
                  </pre>
                </div>
              )}

              <Button
                onClick={next}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-6 text-base font-bold shadow-md transition-all active:scale-[0.98]"
              >
                Continue Flow
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
