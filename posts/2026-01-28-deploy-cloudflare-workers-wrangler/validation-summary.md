# Validation Summary: How to Deploy Cloudflare Workers with Wrangler

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cloudflare Workers
- Wrangler CLI (v3+)
- wrangler.toml configuration
- Cloudflare KV, D1, R2 bindings
- Durable Objects
- GitHub Actions (`cloudflare/wrangler-action@v3`)
- GitLab CI
- TypeScript / `@cloudflare/workers-types`
- Node.js / npm

## Sources Consulted
- Cloudflare Wrangler commands reference: https://developers.cloudflare.com/workers/wrangler/commands/
- Cloudflare wrangler.toml configuration reference: https://developers.cloudflare.com/workers/wrangler/configuration/
- Cloudflare Workers local development docs: https://developers.cloudflare.com/workers/development-testing/
- Cloudflare Workers gradual deployments / versions docs: https://developers.cloudflare.com/workers/configuration/versions-and-deployments/gradual-deployments/
- `cloudflare/wrangler-action` GitHub repository (v3): https://github.com/cloudflare/wrangler-action
- Cloudflare nodejs_compat docs: https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- Wrangler v3 release notes / changelog (kv namespace command rename, deprecation of colon-style commands)

## Issues Found
- **Mermaid `subgraph CI/CD` parsing**: A subgraph name containing `/` can confuse the Mermaid parser. Renamed the subgraph id to `CICD` with the display label `"CI/CD"` (and updated the edge `CI/CD --> Prod` to `CICD --> Prod`) so the diagram renders reliably.
- **`wrangler init my-worker --type=typescript`**: The `--type` flag was removed in Wrangler v2, and `wrangler init` in Wrangler v3 simply delegates to `create-cloudflare`. Replaced with the currently documented entry point `npm create cloudflare@latest my-worker`, with a note that the template (incl. TypeScript) is picked interactively.
- **`wrangler dev --local`**: In Wrangler v3+, local mode is the default (Workerd runs locally), so showing `--local` as a distinct mode is misleading. Removed that line and added a note that `wrangler dev` already runs locally; kept `--remote` as the explicit opt-out for remote resources.
- **`[dev.vars]` in `wrangler.toml`**: This is not a real configuration section. The supported way to override variables for local dev is a `.dev.vars` file (dotenv format) in the project root. Rewrote that snippet accordingly and added a "do not commit" note.
- **`## Resource Management` heading missing the `##`**: The heading was rendered as a plain paragraph. Restored it as a proper level-2 heading so it shows up in the section structure.
- **`wrangler kv:namespace`, `wrangler kv:key`, `wrangler kv:bulk`**: The colon-style commands are deprecated (replaced by space-separated `wrangler kv namespace …`, `wrangler kv key …`, `wrangler kv bulk …` in modern Wrangler). Updated all six commands and added a one-line note explaining the change.
- **`[build.upload]` in `wrangler.toml`**: This is Wrangler 1.x syntax and is no longer recognized in Wrangler 2/3 — the worker format is now inferred from the entry file. Removed the `[build.upload]` block while keeping the surrounding `[build]` block intact.
- **`node_compat = true`**: This top-level option is deprecated in favor of the runtime compatibility flag. Replaced with `compatibility_flags = ["nodejs_compat"]` and updated the inline comment.
- **`wrangler versions deploy <version-id>:10% …`**: The version specifier uses `@`, not `:`, to separate the version id from the percentage (e.g. `<version-id>@10%`). Fixed all three example invocations and clarified the separator in the comment.

## Review Notes
- The Wrangler v1 `[build.upload]` section was the only remaining v1-era artifact; everything else (modules format inference, `compatibility_date`, `routes`, `[[kv_namespaces]]`, `[[d1_databases]]`, `[[r2_buckets]]`, `[[durable_objects.bindings]]`, `[[migrations]]`) is current.
- `wrangler test` shown in the Overview Mermaid diagram is a conceptual "testing" step rather than an actual subcommand — Wrangler does not ship a `test` command (tests are typically run via Vitest with the Workers pool or `@cloudflare/vitest-pool-workers`). Left as-is because it's a diagram label, not executable instruction.
- `compatibility_date = "2024-01-01"` is fine as an illustrative value but readers should bump it to a current date when authoring real workers.
- The `[define] global.process = "undefined"` snippet is valid TOML and a documented use of `[define]` for build-time substitutions, but combined with `compatibility_flags = ["nodejs_compat"]` it's contradictory in real projects (one disables `process`, the other provides it). Kept verbatim since the post presents them as independent options, not a single config.
- `wrangler tail --status` accepts `ok`, `error`, and `canceled` — the example using `error` is correct.
- `wrangler d1 export --output backup.sql` and the rest of the D1/R2 commands match current Wrangler syntax.
- `cloudflare/wrangler-action@v3` is the current major version and matches the documented `apiToken` / `command` / `secrets` inputs used in the GitHub Actions example.
