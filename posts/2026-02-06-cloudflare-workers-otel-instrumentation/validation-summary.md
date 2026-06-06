# Validation Summary: How to Instrument Cloudflare Workers with OpenTelemetry (otel-cf-workers)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cloudflare Workers
- Wrangler configuration
- OpenTelemetry JavaScript API
- @microlabs/otel-cf-workers
- OpenTelemetry Collector
- Durable Objects
- Cloudflare KV

## Sources Consulted
- @microlabs/otel-cf-workers npm package metadata and packaged README/type declarations: https://www.npmjs.com/package/@microlabs/otel-cf-workers
- @microlabs/otel-cf-workers GitHub repository: https://github.com/evanderkoogh/otel-cf-workers
- Cloudflare Workers compatibility flags documentation: https://developers.cloudflare.com/workers/configuration/compatibility-flags/
- Cloudflare Workers limits documentation: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers context documentation: https://developers.cloudflare.com/workers/runtime-apis/context/
- Cloudflare Workers secrets documentation: https://developers.cloudflare.com/workers/configuration/secrets/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The install command omitted the required `@opentelemetry/api` peer dependency. Updated it to install both `@microlabs/otel-cf-workers` and `@opentelemetry/api`.
- The basic JavaScript example imported `ResolveConfigFn`, which is a TypeScript type and not a runtime JavaScript export. Removed it from the JavaScript import.
- The Wrangler configuration omitted `compatibility_flags = [ "nodejs_compat" ]`, which the library README states is required. Added the flag.
- The custom span examples imported `trace`, `context`, and `propagation` from `@microlabs/otel-cf-workers`, but those OpenTelemetry APIs come from `@opentelemetry/api`. Updated the imports.
- The custom span example used the numeric status code `2` for errors. Replaced it with `SpanStatusCode.ERROR` from `@opentelemetry/api`.
- Some custom spans could fail before calling `span.end()`. Wrapped the external fetch and Durable Object examples in `try`/`finally` so spans end reliably.
- The Collector resource processor used `cloudflare_workers` for `cloud.platform`. Updated it to `cloudflare.workers`, matching the value used by the library.
- The performance section showed `ctx.waitUntil(flushTraces())`, but `flushTraces()` was undefined and is not the package API. Replaced it with the library's actual behavior: the `instrument()` wrapper schedules export with `ctx.waitUntil()`.
- The paid Worker CPU time description was outdated/incomplete. Updated it to note the 30s default and configurability up to 5 minutes.

## Review Notes
Cloudflare also offers platform-level OpenTelemetry export for Workers, but this post remains technically relevant as a guide to application-level instrumentation with `@microlabs/otel-cf-workers`.
