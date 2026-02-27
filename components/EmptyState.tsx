"use client";

import { useRouter } from "next/navigation";

export default function EmptyState() {
  const router = useRouter();

  return (
    <div className="bg-gray-900 rounded-2xl shadow-lg p-8 max-w-lg mx-auto w-full text-center space-y-4">
      <div className="text-4xl">&#127919;</div>
      <h2 className="text-xl font-bold text-white">All caught up!</h2>
      <p className="text-gray-400">
        You&apos;ve completed all available scenarios. New ones are added regularly — check back soon.
      </p>
      <button
        onClick={() => router.push("/dashboard")}
        className="px-6 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
      >
        View your stats
      </button>
    </div>
  );
}
