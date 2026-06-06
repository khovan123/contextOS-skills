#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const reserved = new Set([".git", ".github", "_template", "scripts"]);
const errors = [];

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory() || reserved.has(entry.name)) continue;
  validatePack(entry.name, path.join(root, entry.name));
}

if (errors.length) {
  console.error("ContextOS skill validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("ContextOS skill validation passed.");

function validatePack(id, directory) {
  const skillPath = path.join(directory, "SKILL.md");
  const metadataPath = path.join(directory, "skill.yaml");
  if (!fs.existsSync(skillPath)) errors.push(`${id}: missing SKILL.md`);
  if (!fs.existsSync(metadataPath)) {
    errors.push(`${id}: missing skill.yaml`);
    return;
  }

  const skill = safeRead(skillPath);
  const metadata = safeRead(metadataPath);
  const parsedId = scalar(metadata.match(/^id:\s*(.+)$/m)?.[1]);
  const parsedName = scalar(metadata.match(/^name:\s*(.+)$/m)?.[1]);

  if (!/^---\s*$/m.test(skill)) errors.push(`${id}: SKILL.md should include frontmatter`);
  if (parsedId !== id) errors.push(`${id}: skill.yaml id must match folder name`);
  if (!parsedName) errors.push(`${id}: missing name`);
  for (const section of ["positive_triggers", "evidence", "negative_triggers", "workflow"]) {
    if (!new RegExp(`^${section}:`, "m").test(metadata)) {
      errors.push(`${id}: missing ${section}`);
    }
  }
  if (!/prompts:\s*\[.+\]/m.test(metadata)) errors.push(`${id}: positive_triggers.prompts must not be empty`);
  if (!/(files|dependencies):\s*\[.+\]/m.test(metadata)) {
    errors.push(`${id}: evidence should include files or dependencies`);
  }
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function scalar(value = "") {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}
