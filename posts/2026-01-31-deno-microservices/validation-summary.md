# Validation Summary: How to Build Microservices with Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno (runtime, v1.40.0 referenced in Dockerfile)
- Oak middleware framework (v12.6.1)
- deno-postgres (v0.17.0)
- TypeScript
- PostgreSQL (15-alpine)
- Redis (7-alpine)
- Consul (1.15) for service discovery
- Docker / Docker Compose
- Kubernetes (Deployments, HorizontalPodAutoscaler)
- W3C Trace Context (distributed tracing)
- OTLP (OpenTelemetry export format)
- Mermaid diagrams

## Sources Consulted
- Oak framework docs (https://deno.land/x/oak)
- Deno standard library docs (https://docs.deno.com)
- deno-postgres docs (https://deno.land/x/postgres)
- W3C Trace Context specification (https://www.w3.org/TR/trace-context/)
- OpenTelemetry OTLP/HTTP specification
- HashiCorp Consul HTTP API docs (https://developer.hashicorp.com/consul/api-docs)
- Kubernetes API reference for `autoscaling/v2` HPA and probes
- Docker Hub for image tags (denoland/deno, postgres, redis, consul)

## Issues Found
1. **W3C Trace Context trace-id length was incorrect.** The `Tracer.generateId()` produced 16 hex characters and was used for both `traceId` and `spanId`. Per the W3C Trace Context spec, `trace-id` must be 32 hex characters (16 bytes) while `span-id` must be 16 hex characters (8 bytes). Using a 16-char trace-id makes the emitted `traceparent` header invalid and rejected by W3C-compliant backends. Split `generateId()` into `generateTraceId()` (32 chars) and `generateSpanId()` (16 chars) and updated `startSpan()` to call each appropriately.
2. **Rate limiter comment said "sliding window" but the implementation is fixed window.** The code resets the counter when the window expires, which is the textbook fixed-window algorithm; sliding-window would require tracking individual request timestamps or a rolling counter. Updated the comment to "fixed window" to match the actual behavior.

## Review Notes
- `docker-compose.yml` uses `version: '3.8'`, which is obsolete in Docker Compose v2 (top-level `version` is ignored and emits a warning). It still works, so left as-is — common in tutorials.
- The Consul image reference `consul:1.15` still resolves on Docker Hub, but HashiCorp's official path going forward is `hashicorp/consul`. Acceptable for this tutorial.
- Oak's `:path*` route parameter using path-to-regexp can return the captured value as an array depending on the underlying version. Readers reproducing the gateway may need to `.join("/")` it. Left unchanged since it depends on the exact path-to-regexp version bundled and the post is illustrative.
- The JWT verification function is explicitly labeled as a placeholder (the post recommends the `jose` library for production). `atob` does not handle base64url padding/characters correctly, but that caveat is already implicit in the "use a proper JWT library" note.
- Deno 1.40.0 is the version pinned in the Dockerfile. By 2026 there are newer Deno releases (including Deno 2.x), but pinning to a specific older version is a legitimate stylistic choice and the APIs used (`Deno.addSignalListener`, `Application.listen({ signal })`, `crypto.randomUUID`, `fetch`, `AbortController`) all remain valid in subsequent versions.
- The graceful-shutdown sleep of 5 seconds is a simple approach; production systems would prefer tracking in-flight request counts. Mentioned as an area for future improvement, not an error.
