"use client";

import HRPortal from "@/components/HRPortal";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <HRPortal next={() => alert("Moving to next step!")} />
      </div>
    </main>
  );
}
