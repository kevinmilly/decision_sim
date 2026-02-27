"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

const TRACKS = [
  "Software Engineering",
  "Product Management",
  "Engineering Management",
  "DevOps / SRE",
  "Security",
];

const INTERESTS = [
  "Debugging",
  "Architecture",
  "Incident Response",
  "Code Review",
  "Performance",
  "Security",
  "Testing",
  "Deployment",
  "Tech Debt",
  "Hiring / Team",
];

const TIME_OPTIONS = [
  { value: 2, label: "2 min", description: "~4 scenarios" },
  { value: 5, label: "5 min", description: "~10 scenarios" },
  { value: 10, label: "10 min", description: "~20 scenarios" },
];

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [dailyTarget, setDailyTarget] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 3
          ? [...prev, interest]
          : prev
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      const supabase = createClient();
      let userId: string | undefined;

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) {
          setError(`Auth failed: ${anonError.message}. Make sure anonymous sign-in is enabled in Supabase.`);
          setSubmitting(false);
          return;
        }
        userId = anonData.user?.id;
      } else {
        userId = user.id;
      }

      if (!userId) {
        setError("Could not create user session. Please try again.");
        setSubmitting(false);
        return;
      }

      const { error: dbError } = await supabase.from("users").upsert({
        id: userId,
        track_primary: selectedTrack,
        interests,
        daily_target_minutes: dailyTarget,
        onboarding_completed: true,
      });

      if (dbError) {
        setError(`Failed to save profile: ${dbError.message}`);
        setSubmitting(false);
        return;
      }

      router.replace("/feed");
    } catch (e) {
      setError(`Unexpected error: ${e instanceof Error ? e.message : "Unknown"}`);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4">
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">
            What&apos;s your primary role?
          </h2>
          <div className="space-y-2">
            {TRACKS.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSelectedTrack(t);
                  setStep(1);
                }}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                  selectedTrack === t
                    ? "border-brand-500 bg-brand-900/20"
                    : "border-gray-700 hover:border-brand-400"
                }`}
              >
                <span className="font-medium text-white">
                  {t}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">
            Pick up to 3 interests
          </h2>
          <p className="text-gray-400">
            We&apos;ll prioritize scenarios in these areas
          </p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  interests.includes(interest)
                    ? "bg-brand-500 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={interests.length === 0}
            className="w-full py-3 bg-brand-500 text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-brand-600 transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">
            Daily time commitment
          </h2>
          <div className="space-y-3">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDailyTarget(opt.value)}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                  dailyTarget === opt.value
                    ? "border-brand-500 bg-brand-900/20"
                    : "border-gray-700 hover:border-brand-400"
                }`}
              >
                <span className="font-semibold text-white">
                  {opt.label}
                </span>
                <span className="text-gray-400 ml-2">{opt.description}</span>
              </button>
            ))}
          </div>
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-brand-500 text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-brand-600 transition-colors"
          >
            {submitting ? "Setting up..." : "Start training"}
          </button>
        </div>
      )}
    </div>
  );
}
