# Validation Summary: How to Use OpenTelemetry with Cloudflare Workers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- Cloudflare Workers
- Cloudflare Workers runtime APIs
- Wrangler configuration and secrets
- Workers KV
- Durable Objects
- Cron Triggers
- TypeScript
- JavaScript Fetch API
- W3C Trace Context propagation

## Sources Consulted
- Cloudflare Workers runtime APIs: https://developers.cloudflare.com/workers/runtime-apis/
- Cloudflare Workers environment variables: https://developers.cloudflare.com/workers/configuration/environment-variables/
- Cloudflare Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Cloudflare scheduled handler / Cron Triggers: https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
- Cloudflare execution context and `ctx.waitUntil()`: https://developers.cloudflare.com/workers/runtime-apis/context/
- Cloudflare Workers KV documentation: https://developers.cloudflare.com/kv/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- `@microlabs/otel-cf-workers` published package README and TypeScript definitions, version `1.0.0-rc.52`: https://www.npmjs.com/package/@microlabs/otel-cf-workers
- `@microlabs/otel-cf-workers` source repository: https://github.com/evanderkoogh/otel-cf-workers
- Wrangler CLI help for `wrangler secret put`, checked with `npx wrangler secret put --help`

## Issues Found
- The install command omitted the required `@opentelemetry/api` peer dependency. Updated the command to install both `@microlabs/otel-cf-workers` and `@opentelemetry/api`.
- The SDK documentation for `@microlabs/otel-cf-workers` currently requires Cloudflare's `nodejs_compat` compatibility flag. Added `compatibility_flags = [ "nodejs_compat" ]` to the `wrangler.toml` example.
- The runtime explanation said Workers have no Node.js built-in modules at all. Cloudflare now supports a subset of Node.js APIs behind compatibility support, so the wording was updated to reflect that Workers are not a full Node.js runtime.
- The post said the `ResolveConfigFn` configuration function is called once when the Worker starts handling requests. The package documentation says it runs for each invocation, so the comment was corrected.
- The custom span examples ended some spans only on the success path. Updated the child span, KV, and Durable Object examples to end spans in `finally` blocks so exceptions do not leave spans unfinished.
- The scheduled handler example used `ScheduledEvent`. Cloudflare's module syntax TypeScript examples use `ScheduledController`, so the example was updated to use `controller.cron` and `controller.scheduledTime`.

## Review Notes
- The `@microlabs/otel-cf-workers` package is currently published as `1.0.0-rc.52`, so future API changes are possible before a stable 1.0 release.
- The package also auto-instruments global `fetch`, caches, and supported bindings. The manual KV and Durable Object examples are still valid as examples of custom application spans, but users should avoid creating duplicate low-value spans in production.
