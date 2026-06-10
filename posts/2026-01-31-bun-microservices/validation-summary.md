# Validation Summary: How to Build Microservices with Bun

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun (HTTP server, runtime, package manager, lockfile)
- TypeScript
- Docker (multi-stage builds, healthchecks)
- Docker Compose
- PostgreSQL (postgres:15-alpine)
- Redis (redis:7-alpine)
- Jaeger (distributed tracing collector)
- Consul (service discovery, HTTP API)
- Web Crypto API (`crypto.randomUUID`)
- W3C Fetch / Request / Response standards
- AbortSignal.timeout
- Kubernetes liveness/readiness conventions
- Mermaid diagrams (architecture/sequence)

## Sources Consulted
- Bun HTTP server docs — https://bun.sh/docs/api/http (verified `Bun.serve` API, `Server.stop()` signature, route patterns, type imports)
- Bun Docker Hub — https://hub.docker.com/r/oven/bun/tags (verified `oven/bun:1` and `oven/bun:1-slim` tags both exist, alongside `alpine`, `debian`, `distroless`)
- Bun install CLI docs — `bun install --frozen-lockfile` is a valid, documented flag
- Consul HTTP API — `/v1/agent/service/register`, `/v1/agent/service/deregister/:id`, `/v1/health/service/:name?passing=true` are correct endpoints
- W3C Fetch standard — `Request`, `Response`, `Headers`, `AbortSignal.timeout(ms)` are part of the standard
- Docker Compose docs — `condition: service_healthy`, `healthcheck`, and `restart: unless-stopped` are valid Compose fields

## Issues Found
- **Broken dynamic-route matching in `BaseService`.** The original `handleRequest` did `methodRoutes.get(path)` — an exact-match lookup against the registered pattern string. The User Service registers `/users/:id`, `/users/:id` (PUT), `/users/:id` (DELETE), and parses the ID from `req.url`, but the lookup would never match a real path like `/users/abc-123` because the key in the map is the literal string `"/users/:id"`. Every request to a parameterized route would have returned 404. Fixed by adding a `matchPattern` helper that falls back to a colon-prefix-aware comparison when the exact-match lookup misses. Minimal change: only the routing logic in `handleRequest` was modified; the public `registerRoute` API and example code in subsequent sections are unchanged.

## Review Notes
- The post uses the older `import { serve } from "bun"` / `fetch` handler style rather than the modern (Bun 1.2.3+) `Bun.serve({ routes: { "/users/:id": ... } })` pattern, which has native parameter support. The legacy style is still supported, so this is a style choice, not an error. A future revision could mention `Bun.serve`'s native routing as a simpler alternative to the hand-rolled router.
- `bun.lockb` (binary) is referenced in the Dockerfile. Bun 1.2+ defaults to the text-format `bun.lock`, but `bun.lockb` is still recognized for backward compatibility. Newer projects will likely have `bun.lock` instead.
- `docker-compose.yml` declares `version: '3.8'`. Compose v2 treats this top-level `version` field as obsolete and emits a warning, but still accepts it. Not a hard error.
- `Server.stop()` returns a Promise per the Bun docs; the shutdown handler calls it without `await`, relying on the subsequent 5-second `setTimeout` to give the server time to drain. Functionally OK in practice but `await this.server.stop()` would be more correct.
- The Dockerfile healthcheck uses `curl -f`. The `oven/bun:1-slim` image (Debian slim base) does not ship with `curl` by default, so the healthcheck would fail unless `curl` is installed via an extra `RUN apt-get install -y curl` step or replaced with `bun -e "fetch(...)"`. Worth flagging in a future revision.
- The W3C Trace Context standard specifies 128-bit trace IDs (32 hex chars) and 64-bit span IDs (16 hex chars). The post's `Tracer` uses 16 hex chars for both, which is internally consistent for demo purposes but not W3C-compatible — fine for the simplified educational example.
- `forwardRequest` in the API Gateway passes `headers: req.headers` directly to `fetch`, which would include the original `Host` header. Most fetch implementations override `Host` on outbound requests, so this is benign, but explicit header copying with a filter (`Host`, `Content-Length`) would be more robust.
- The rate limiter uses `x-forwarded-for`/`x-real-ip` for client identification with no signature verification — fine as illustration, but the post correctly characterizes this as a "simple" rate limiter.
