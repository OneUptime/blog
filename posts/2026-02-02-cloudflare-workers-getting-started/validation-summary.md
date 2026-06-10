# Validation Summary: How to Get Started with Cloudflare Workers

## Status
validated

## Post Type
Tutorial / Getting-started guide

## Technologies Covered
- Cloudflare Workers (V8 isolates runtime)
- Wrangler CLI (project scaffolding, dev server, deploy, tail, secrets, KV)
- Workers KV (key-value store, metadata, list, expiration TTL)
- Durable Objects (stateful coordination, SQLite-backed storage, migrations)
- Cloudflare Cache API (`caches.default`)
- `wrangler.toml` configuration (bindings, vars, routes, custom domains, environments)
- Vitest with `@cloudflare/vitest-pool-workers`
- JavaScript ES Modules Worker format (`export default { fetch }`)
- Fetch API, AbortController, `ctx.waitUntil`

## Sources Consulted
- Cloudflare Workers docs — https://developers.cloudflare.com/workers/
- Wrangler deprecations & v3→v4 migration — https://developers.cloudflare.com/workers/wrangler/deprecations/ and https://developers.cloudflare.com/workers/wrangler/migration/update-v3-to-v4/
- Wrangler KV commands reference — https://developers.cloudflare.com/kv/reference/kv-commands/
- KV API (read/write) — https://developers.cloudflare.com/kv/api/read-key-value-pairs/ and https://developers.cloudflare.com/kv/api/write-key-value-pairs/
- Durable Objects migrations — https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/
- Durable Object base class & state — https://developers.cloudflare.com/durable-objects/api/base/ and https://developers.cloudflare.com/durable-objects/api/state/
- SQLite-backed DO storage — https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- Migrate from `unstable_dev` to Vitest pool — https://developers.cloudflare.com/workers/testing/vitest-integration/migration-guides/migrate-from-unstable-dev/
- Workers platform limits — https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare global network — https://www.cloudflare.com/network/

## Issues Found

1. **Outdated project scaffolding command.** The post used `wrangler init my-first-worker`, which Cloudflare deprecated; modern projects are created via the C3 (`create-cloudflare`) wrapper. Updated to `npm create cloudflare@latest -- my-first-worker`, which is the officially recommended command and matches what `wrangler init` now forwards to.

2. **Deprecated KV namespace command syntax.** The post used the legacy colon form `wrangler kv:namespace create "MY_KV"` (both in the inline comment and the prose hint). Wrangler v3.60.0+ deprecated the colon namespaces in favor of space-separated subcommands. Updated to `wrangler kv namespace create "MY_KV"` in both occurrences.

3. **Durable Objects migration used the legacy KV-backed storage form.** The post had `new_classes = ["Counter"]`, which still works but creates a legacy KV-backed Durable Object. Cloudflare now recommends SQLite-backed Durable Objects for new projects. Updated the migration to `new_sqlite_classes = ["Counter"]` and corrected the accompanying comment (which previously said the migrations block tells Wrangler "where to find" the class — it actually declares class lifecycle for the deployment).

4. **Broken Vitest test example (missing import + deprecated API).** The original example imported `describe, it, expect, beforeAll` but called `afterAll(...)` without importing it — this would fail at runtime with `ReferenceError: afterAll is not defined`. The example also used `unstable_dev` from the `wrangler` package, which Cloudflare has superseded with `@cloudflare/vitest-pool-workers`. Replaced the example with the current pattern: a `vitest.config.js` using `defineWorkersConfig` plus a test file that uses `SELF` from `cloudflare:test`. This both fixes the missing-import bug and brings the testing approach up to date.

## Review Notes

- The Durable Object example uses the older `constructor(state, env)` parameter name with `this.state.storage.get/put`. Cloudflare's newer documentation favors `(ctx, env)` with `this.ctx.storage`. The two are functionally identical (only the parameter name changes), so this is left as-is — it's stylistic, not incorrect.
- "300+ cities worldwide" understates Cloudflare's current footprint (the network is at 330+ cities), but the claim is technically true (>300), so it's left unchanged.
- The free-tier CPU-time limit ("10ms CPU") and paid-tier limit ("30 seconds") are accurate as base defaults. Paid plans can extend CPU time further (up to 5 minutes), which the post does not mention — acceptable for an intro post.
- The `compatibility_date = "2024-01-01"` value in the `wrangler.toml` snippets is a placeholder. Real projects should set a recent date; this is conventional in tutorial snippets and left unchanged.
- The Counter Durable Object's `let count = await this.state.storage.get('count') || 0;` works because Durable Object requests are serialized to a single instance — there is no race in the example as written. Worth a future note for readers building production counters with `blockConcurrencyWhile` or transactions, but not incorrect.
