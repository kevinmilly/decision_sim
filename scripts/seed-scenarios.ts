import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role for seeding

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface SeedScenario {
  domain: string;
  difficulty: number;
  prompt: string;
  options: Array<{ key: string; text: string }>;
  correct_option: string;
  answer_defensibility: number;
  reveal_summary: string;
  reveal_detail: string;
  tags: string[];
  source_title?: string;
  source_url?: string;
  nudge_framework?: string;
  nudge_text?: string;
}

async function seed() {
  const filePath = join(
    __dirname,
    "..",
    "content",
    "seeds",
    "software-engineering.json"
  );
  const raw = readFileSync(filePath, "utf-8");
  const scenarios: SeedScenario[] = JSON.parse(raw);

  console.log(`Seeding ${scenarios.length} scenarios...`);

  const rows = scenarios.map((s) => ({
    ...s,
    status: "published",
  }));

  // Insert in batches of 25
  for (let i = 0; i < rows.length; i += 25) {
    const batch = rows.slice(i, i + 25);
    const { error } = await supabase.from("scenarios").insert(batch);
    if (error) {
      console.error(`Error inserting batch at index ${i}:`, error);
      process.exit(1);
    }
    console.log(`Inserted ${Math.min(i + 25, rows.length)} / ${rows.length}`);
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
