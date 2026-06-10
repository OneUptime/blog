# Validation Summary: How to Use Deno Deploy for Serverless Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno runtime (Deno 2.x)
- Deno Deploy (edge serverless platform)
- Deno KV (distributed key-value store)
- Deno Cron (scheduled tasks)
- `Deno.serve` HTTP server API
- `deployctl` CLI
- TypeScript
- PostgreSQL via postgres.js (`https://deno.land/x/postgresjs`)
- Web standard APIs: `fetch`, `Request`, `Response`, `URL`, `crypto.randomUUID()`

## Sources Consulted
- Deno Deploy `deployctl` documentation: https://docs.deno.com/deploy/manual/deployctl/
- Deno HTTP server documentation: https://docs.deno.com/runtime/fundamentals/http_server/
- Deno KV documentation: https://docs.deno.com/deploy/kv/manual/
- Deno Cron documentation: https://docs.deno.com/deploy/kv/manual/cron/
- Deno `install` CLI reference: https://docs.deno.com/runtime/reference/cli/install/
- postgres.js on deno.land/x: https://deno.land/x/postgresjs
- Deno Deploy regions documentation: https://docs.deno.com/deploy/

## Issues Found
1. **`deployctl` install command missing `-g` flag.** The post used `deno install -Arf jsr:@deno/deployctl`, but in Deno 2.0+ the `deno install` command without `-g` installs the package as a local project dependency rather than a globally available CLI executable. Fixed to `deno install -gArf jsr:@deno/deployctl` per the current official Deno Deploy documentation.

2. **Unsupported "under 10ms" cold start claim.** The post stated cold starts are "typically under 10ms". Official Deno documentation does not state a specific millisecond figure for cold starts; it only makes qualitative/comparative claims about V8 isolates being faster than VMs or traditional Lambda. Removed the specific number while keeping the qualitative statement that V8 isolates provide fast cold starts.

## Review Notes
- The `postgres.js` import pins version `v3.4.4`. This is a real, published version, but the current latest is `v3.4.8`. The pinned version is still functional, so no change required, but the post may want to be refreshed in the future.
- Deno KV remains an unstable API as of writing — it is automatically enabled on Deno Deploy, but local execution requires the `--unstable-kv` flag (not mentioned in the post). This is a minor caveat that does not invalidate the code samples in the context of Deno Deploy.
- The `kv.atomic().check(entry)` pattern relies on TypeScript structural typing: `kv.get()` returns a `KvEntryMaybe` which has the `key` and `versionstamp` properties required by `AtomicCheck`. This works correctly.
- The UUID regex `/^\/api\/users\/([a-f0-9-]+)$/` is loose (does not enforce the canonical 8-4-4-4-12 UUID format), but is acceptable for routing purposes.
- The "35+ regions" claim is broadly accurate for the modern Deno Deploy platform. (Deno Deploy Classic with 6 regions sunsets July 20, 2026, but the post does not mention Classic.)
- The post correctly demonstrates current `Deno.serve`, `Deno.openKv`, and `Deno.cron` APIs.
