import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cwd = process.cwd();
  const contentDir = path.join(cwd, "src/content/changelog");
  const results: Record<string, unknown> = { cwd, contentDir };

  try {
    const files = await fs.readdir(contentDir);
    results.files = files;
    results.fileCount = files.length;
  } catch (err: unknown) {
    results.readdirError = err instanceof Error ? err.message : String(err);
  }

  const altPaths = [
    path.join(cwd, "src", "content", "changelog"),
    path.join(cwd, ".next", "server", "src", "content", "changelog"),
    path.join(cwd, "content", "changelog"),
  ];
  results.altPathChecks = {};
  for (const p of altPaths) {
    try {
      const f = await fs.readdir(p);
      (results.altPathChecks as Record<string, string[]>)[p] = f;
    } catch {
      (results.altPathChecks as Record<string, string>)[p] = "not found";
    }
  }

  try {
    const rootFiles = await fs.readdir(cwd);
    results.rootFiles = rootFiles.slice(0, 30);
  } catch {
    results.rootFiles = "could not read";
  }

  try {
    const srcFiles = await fs.readdir(path.join(cwd, "src"));
    results.srcFiles = srcFiles;
  } catch {
    results.srcDir = "not found";
  }

  try {
    const contentFiles = await fs.readdir(path.join(cwd, "src", "content"));
    results.contentFiles = contentFiles;
  } catch {
    results.contentDir2 = "not found";
  }

  return NextResponse.json(results, { status: 200 });
}
