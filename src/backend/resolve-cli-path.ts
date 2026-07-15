/**
 * Resolve which beads CLI binary to invoke.
 *
 * Precedence: BEADS_CLI env > configured path > default.
 * Empty strings are treated as "not set" so a misconfigured setting
 * doesn't silently override the env or default.
 */
export const DEFAULT_CLI = "bd";

export function resolveCliPath(configured: string | undefined): string {
  const fromEnv = process.env.BEADS_CLI;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (configured && configured.length > 0) return configured;
  return DEFAULT_CLI;
}