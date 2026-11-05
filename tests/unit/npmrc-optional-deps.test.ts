/*
 * Regression test for LAC-6906.
 *
 * `.npmrc` once carried `omit=optional`. Bun reads `.npmrc`, so that single
 * line made every install skip *all* optionalDependencies — which is how
 * platform binaries ship. On a clean CI runner nothing provided
 * `@esbuild/<platform>`, `@biomejs/cli-<platform>` or
 * `@rollup/rollup-<platform>`, so the root `postinstall` (fumadocs-mdx),
 * lint, typecheck and the vitest suites all died at module resolution before
 * any project code ran. CI was red on `main` for over a month.
 *
 * The failure is invisible on a developer machine with a warm `node_modules`,
 * so assert the config directly rather than waiting for a cold runner.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const npmrc = readFileSync(join(process.cwd(), ".npmrc"), "utf8");

const directives = npmrc
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith(";") && !line.startsWith("#"));

describe(".npmrc", () => {
  test("does not omit optional dependencies", () => {
    const omits = directives
      .filter((line) => line.startsWith("omit"))
      .filter((line) => line.split("=")[1]?.trim() === "optional");

    expect(omits).toEqual([]);
  });

  test("does not disable optional dependencies by any other spelling", () => {
    const offenders = directives.filter((line) => {
      const [rawKey, rawValue] = line.split("=");
      const key = rawKey?.trim();
      const value = rawValue?.trim();

      // `no-optional=true` and `optional=false` are the other two ways npm
      // and bun accept the same instruction.
      if (key === "no-optional") return value !== "false";
      if (key === "optional") return value === "false";
      return false;
    });

    expect(offenders).toEqual([]);
  });
});
