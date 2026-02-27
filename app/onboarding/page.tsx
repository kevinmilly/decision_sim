import OnboardingForm from "@/components/OnboardingForm";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex flex-col justify-center py-12">
      <div className="text-center mb-8 px-4">
        <h1 className="text-4xl font-bold text-white mb-2">
          Judgment Gym
        </h1>
        <p className="text-gray-400 text-lg mb-1">
          Decision Calibration
        </p>
        <p className="text-gray-500 text-sm">
          Make a call, set your confidence, and learn how accurate your gut really is.
        </p>
      </div>
      <OnboardingForm />
    </main>
  );
}
