# Validation Summary: How to Debug Cloudflare Workers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cloudflare Workers
- Wrangler CLI (`wrangler dev`, `wrangler tail`)
- TypeScript
- Chrome DevTools (inspector protocol)
- Miniflare (for unit testing)
- Vitest (testing framework)
- W3C Trace Context (`traceparent` header)
- Web Crypto API (`crypto.randomUUID()`)
- Fetch API (`Request`, `Response`, `Response.json()`)
- wrangler.toml configuration

## Sources Consulted
- Cloudflare Workers documentation: https://developers.cloudflare.com/workers/
- Wrangler CLI commands reference: https://developers.cloudflare.com/workers/wrangler/commands/
- `wrangler dev` docs (local vs remote mode, default behavior in v3+): https://developers.cloudflare.com/workers/wrangler/commands/#dev
- `wrangler tail` docs (filters, sampling rate, format): https://developers.cloudflare.com/workers/wrangler/commands/#tail
- Workers platform limits (CPU time): https://developers.cloudflare.com/workers/platform/limits/
- Workers Free vs Paid plan limits: https://developers.cloudflare.com/workers/platform/pricing/
- Miniflare documentation: https://miniflare.dev/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- MDN Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID

## Issues Found

1. **Inverted `wrangler dev` local/remote semantics** (around line 45–58 of the original)
   - The post described `wrangler dev` as starting with remote resources and `wrangler dev --local` as local-only mode. This reflects Wrangler v1/v2 behavior.
   - Since Wrangler v3 (released August 2023), `wrangler dev` runs **locally by default** using workerd, and `--remote` is the flag used to connect to Cloudflare's remote network. The `--local` flag is effectively a no-op in current Wrangler.
   - Fixed by replacing the `--local` example with `--remote` and updating the comments to reflect current Wrangler v3+ behavior.

2. **Incorrect CPU time limit description** (around line 745)
   - The comment in the CPU Time Limits example said "50ms for free, more for paid". This is incorrect.
   - The Workers **Free** plan provides 10ms of CPU time per request. The Workers **Paid** plan allows up to 30 seconds of CPU time per invocation (configurable via the `cpu_ms` setting, defaulting to 30,000ms).
   - Fixed by updating the comment to "10ms for Free plan, up to 30s for Paid" and adjusting the early-exit threshold from `> 40` (which would never trigger before the 10ms free-tier limit) to `> 8` so the example is realistic for the free tier.

## Review Notes

- `unstable_dev` from Wrangler is functional but marked unstable. In newer Wrangler workflows, `getPlatformProxy` from `wrangler` (or the `@cloudflare/vitest-pool-workers` package) is the recommended approach for testing. The example still works, but readers using the latest Wrangler may want to consider those alternatives.
- The Miniflare example uses the v3 (npm `miniflare` package) constructor API which is correct. The `scriptPath` option still works; newer setups often prefer `modules` or a `script` option. No fix needed.
- `Response.json(value, init)` static method is supported in Workers runtime — correct usage.
- `crypto.randomUUID()` is available in the Workers runtime — correct usage.
- The W3C Trace Context parsing is simplified (only extracts traceId/spanId, no version/flags validation), which is acceptable for an example but real implementations should validate the version and flags.
- wrangler.toml inline-table syntax `vars = { DEBUG = "true" }` inside `[env.production]` is valid TOML and is the documented Cloudflare pattern. Note: Cloudflare also now supports `wrangler.jsonc`, but `wrangler.toml` examples remain accurate.
- The `wrangler tail` filter flags (`--status`, `--search`, `--method`, `--ip`, `--format`, `--sampling-rate`) are all current and correct.
