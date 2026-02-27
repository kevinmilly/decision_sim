"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DOMAINS = [
  "debugging",
  "architecture",
  "incident-response",
  "code-review",
  "performance",
  "security",
  "testing",
  "deployment",
  "tech-debt",
  "hiring",
];

interface Option {
  key: string;
  text: string;
}

export default function AdminPage() {
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [difficulty, setDifficulty] = useState(2);
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<Option[]>([
    { key: "A", text: "" },
    { key: "B", text: "" },
    { key: "C", text: "" },
    { key: "D", text: "" },
  ]);
  const [correctOption, setCorrectOption] = useState("A");
  const [defensibility, setDefensibility] = useState(75);
  const [revealSummary, setRevealSummary] = useState("");
  const [revealDetail, setRevealDetail] = useState("");
  const [tags, setTags] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [nudgeFramework, setNudgeFramework] = useState("");
  const [nudgeText, setNudgeText] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.from("scenarios").insert({
      domain,
      difficulty,
      prompt,
      options,
      correct_option: correctOption,
      answer_defensibility: defensibility,
      reveal_summary: revealSummary,
      reveal_detail: revealDetail,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      source_title: sourceTitle || null,
      source_url: sourceUrl || null,
      nudge_framework: nudgeFramework || null,
      nudge_text: nudgeText || null,
      status,
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Scenario saved!");
      // Reset form
      setPrompt("");
      setOptions([
        { key: "A", text: "" },
        { key: "B", text: "" },
        { key: "C", text: "" },
        { key: "D", text: "" },
      ]);
      setRevealSummary("");
      setRevealDetail("");
      setTags("");
      setSourceTitle("");
      setSourceUrl("");
      setNudgeFramework("");
      setNudgeText("");
    }
    setSaving(false);
  };

  const updateOption = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], text };
    setOptions(newOptions);
  };

  return (
    <main className="min-h-screen pb-12">
      <header className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h1 className="font-bold text-gray-900 dark:text-white">
          Scenario Editor
        </h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Domain
            </label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Difficulty (1-5)
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prompt ({prompt.length}/500)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Options */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Options
          </label>
          {options.map((opt, i) => (
            <div key={opt.key} className="flex items-center gap-2">
              <span className="font-semibold text-brand-600 w-6">
                {opt.key}.
              </span>
              <input
                type="text"
                value={opt.text}
                onChange={(e) => updateOption(i, e.target.value)}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="correct"
                  checked={correctOption === opt.key}
                  onChange={() => setCorrectOption(opt.key)}
                />
                <span className="text-xs text-gray-500">Correct</span>
              </label>
            </div>
          ))}
        </div>

        {/* Defensibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Answer Defensibility: {defensibility}%
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={defensibility}
            onChange={(e) => setDefensibility(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Reveal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reveal Summary ({revealSummary.length}/280)
          </label>
          <textarea
            value={revealSummary}
            onChange={(e) => setRevealSummary(e.target.value)}
            maxLength={280}
            rows={2}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reveal Detail
          </label>
          <textarea
            value={revealDetail}
            onChange={(e) => setRevealDetail(e.target.value)}
            rows={4}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="async, node.js, api"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Source */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source Title
            </label>
            <input
              type="text"
              value={sourceTitle}
              onChange={(e) => setSourceTitle(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source URL
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Nudge */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nudge Framework
            </label>
            <input
              type="text"
              value={nudgeFramework}
              onChange={(e) => setNudgeFramework(e.target.value)}
              placeholder="e.g., First Principles"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nudge Text
            </label>
            <input
              type="text"
              value={nudgeText}
              onChange={(e) => setNudgeText(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Status & Submit */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                checked={status === "draft"}
                onChange={() => setStatus("draft")}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Draft
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                checked={status === "published"}
                onChange={() => setStatus("published")}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Published
              </span>
            </label>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !prompt || !revealSummary}
            className="px-6 py-2 bg-brand-500 text-white rounded-lg font-semibold disabled:opacity-40 hover:bg-brand-600 transition-colors"
          >
            {saving ? "Saving..." : "Save Scenario"}
          </button>
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.startsWith("Error") ? "text-red-600" : "text-green-600"
            }`}
          >
            {message}
          </p>
        )}

        {/* Live preview */}
        {prompt && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">
              PREVIEW
            </h3>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 px-2 py-1 rounded-full">
                  {domain}
                </span>
                <span className="text-xs text-gray-400">
                  Difficulty {difficulty}
                </span>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {prompt}
              </p>
              <div className="space-y-2">
                {options.map((opt) => (
                  <div
                    key={opt.key}
                    className={`p-3 rounded-xl border-2 ${
                      correctOption === opt.key
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200"
                    }`}
                  >
                    <span className="font-semibold mr-2">{opt.key}.</span>
                    <span>{opt.text || "..."}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
