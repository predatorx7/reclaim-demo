"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { getReclaimConfig, verifyProofResponse } from "@/lib/services/api";

const HR_PROVIDERS = [
  { id: "examplepayroll", name: "Example Payroll" }
];

export default function HRPortal({ next }: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [responseData, setResponseData] = useState<any>(null);
  const [verificationStep, setVerificationStep] = useState<"choice" | "verifying" | "completed">("choice");
  const [selectedProvider, setSelectedProvider] = useState<string>(HR_PROVIDERS[0].id);

  /**
   * ✅ Reclaim Protocol Verification Flow
   * 
   * This is the core Reclaim integration logic. Let's walk through it step-by-step!
   */
  const startVerification = useCallback(async () => {
    console.log("[HRPortal] Starting verification...");
    setErrorMessage("");
    setResponseData(null);
    setVerificationStep("verifying");
    setIsLoading(true);

    try {
      // 1️⃣ SECURELY FETCH CONFIG FROM BACKEND
      // We ask our backend to generate the session config because it securely holds our APP_SECRET.
      // Exposing the Reclaim APP_SECRET directly in the frontend is a security hazard!
      const configResponse = await getReclaimConfig(selectedProvider);

      if (!configResponse || !configResponse.reclaimProofRequestConfig) {
        throw new Error("Invalid config response from backend");
      }

      const { reclaimProofRequestConfig } = configResponse;

      // 2️⃣ RECONSTRUCT THE PROOF REQUEST
      // The backend has handed us a pre-signed JSON config string. We parse it back into the
      // native JS SDK `ReclaimProofRequest` object to control the frontend UI logic.
      const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(
        reclaimProofRequestConfig
      );

      // 3️⃣ OPEN THE QR / VERIFICATION UI
      // This immediately triggers the verification flow. The user will be prompted to prove their data seamlessly safely!
      // We also hold onto the `flowHandle` so we can programmatically close it later.
      const flowHandle = await reclaimProofRequest.triggerReclaimFlow();

      // 4️⃣ SET UP THE LISTENER CALLBACKS
      // We await `.startSession()` which perpetually polls for the verified proof status and handles callbacks.
      await reclaimProofRequest.startSession({
        onSuccess: async (proofs) => {
          try {
            // Reclaim has yielded a proof that the user verified!
            console.log("[HRPortal] Raw proofs received:", proofs);

            // Programmatically close the QR code/modal gracefully.
            flowHandle?.close();

            if (!proofs) {
              throw new Error("Proof unexpectedly empty");
            }

            // 5️⃣ SEND THE PROOF TO OUR BACKEND FOR VERIFICATION
            // Now we send the proof object directly to our Fastify backend.
            // Even though Reclaim generated this, we must verify the cryptographic signatures 
            // natively on our server to be absolutely certain it wasn't intercepted or modified.
            const result = await verifyProofResponse(proofs);

            // Verification succeeded!
            setResponseData(result);
            setVerificationStep("completed");

          } catch (err) {
            setErrorMessage(`Error processing verification on backend: ${String(err)}`);
            setVerificationStep("choice");
          } finally {
            setIsLoading(false);
          }
        },

        onError: (error) => {
          console.error("[HRPortal] SDK Cancelled or Errored:", error);
          setErrorMessage(`Verification cancelled by user or failed.`);
          setVerificationStep("choice");
          setIsLoading(false);
        },

        verificationConfig: {
          // This tells the local SDK session to bypass structural assertion since our backend
          // will fully mathematically verify it using verifyProof() anyway!
          dangerouslyDisableContentValidation: true,
        }
      });

    } catch (err) {
      console.error("[HRPortal] Critical Error:", err);
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
                  To automatically verify your employment status, please log into your payroll provider. Reclaim Protocol creates a mathematically secure zero-knowledge proof locally on your device without exposing your credentials.
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
                  <p className="text-sm font-medium text-red-800">{errorMessage}</p>
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
                <div className="text-xl font-bold text-slate-800">Interacting with Reclaim...</div>
                <div className="text-sm text-slate-500 text-center max-w-xs">
                  Please complete the verification dynamically in the open portal or by scanning the QR code if verifying on mobile!
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-6">
                  <p className="text-sm font-medium text-red-800 text-center">{errorMessage}</p>
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
                <h4 className="font-bold text-emerald-900 mb-1 text-lg">Cryptographically Verified!</h4>
                <p className="text-sm text-emerald-700 text-center">Your employment proof has been secured and confirmed via zero-knowledge proof by our backend server.</p>
              </div>

              {responseData && (
                <div className="bg-slate-900 rounded-xl p-5 overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                    <h4 className="font-semibold text-slate-300 text-sm tracking-wide uppercase">Extracted Metadata Payload</h4>
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