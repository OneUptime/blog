# Validation Summary: How to Optimize Bun Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun runtime (JavaScriptCore-based)
- TypeScript
- `bun:sqlite` (Bun's built-in SQLite driver)
- `Bun.serve` (HTTP and WebSocket server)
- `Bun.build` (bundler)
- `Bun.nanoseconds` / `Bun.sleep` (utilities)
- WebStreams (`ReadableStream`, `TextEncoder`)
- `process.memoryUsage()` (Node-compat API)
- bunfig.toml configuration

## Sources Consulted
- Bun official documentation: https://bun.sh/docs
- Bun API reference: https://bun.sh/docs/api/utils (`Bun.nanoseconds`, `Bun.sleep`)
- Bun.serve docs: https://bun.sh/docs/api/http
- Bun WebSockets docs: https://bun.sh/docs/api/websockets (`server.upgrade`)
- Bun.build docs: https://bun.sh/docs/bundler
- bun:sqlite docs: https://bun.sh/docs/api/sqlite
- bunfig.toml reference: https://bun.sh/docs/runtime/bunfig
- Debugger docs: https://bun.sh/docs/runtime/debugger (`--inspect`)

## Issues Found

1. **Architecture section — inaccurate low-level claims.** The original post claimed Bun uses `io_uring` on Linux for file operations and offers "zero-copy networking". Neither is stated in official Bun documentation; Bun's networking is built on uSockets (epoll/kqueue/IOCP). Replaced with "Fast native file system operations" and "Native, low-overhead HTTP implementation built on uSockets" so the claims are accurate and verifiable.

2. **CPU profiling description.** The post said `bun --inspect run server.ts` is used to "generate CPU profiles". `--inspect` actually attaches the WebKit Inspector debugger (which exposes a profiler tab among other tools); it is not a dedicated CPU profiling flag. Reworded to describe attaching the WebKit Inspector to debug and profile, keeping the command itself intact.

3. **WebSocket example missing upgrade call.** In the "Connection Keep-Alive and HTTP/2" example, `Bun.serve` defined `websocket` handlers, but the `fetch` handler unconditionally returned a `Response.json`, meaning `server.upgrade(req)` was never called and the WebSocket handlers would never fire. Added the `server` parameter to the `fetch` signature and an `if (server.upgrade(request)) return;` branch, which is the documented Bun pattern.

## Review Notes

- The `import { Readable } from "stream"` line in the streaming-response example is unused (the example uses Web Streams `ReadableStream`, not Node's `Readable`). It is dead code but not technically incorrect, so it was left in place per the "only fix technical errors" instruction.
- The section heading "Connection Keep-Alive and HTTP/2" mentions HTTP/2, but Bun.serve's built-in server is HTTP/1.1; HTTP/2 is typically terminated at a reverse proxy. The heading is aspirational rather than technically wrong, so it was left alone.
- The `RequestDeduplicator` returns `existing.then(r => r.clone())` for shared in-flight requests, which is correct for allowing each caller to consume the body independently — but note that if any single caller errors before the original response is delivered, that error still propagates. This is acceptable behavior, just worth being aware of.
- The connection pool's `release` method increments `inUse.add(conn)` again before resolving a waiter — this is correct (the connection stays "in use" by the waiter) but readers may find the bookkeeping subtle.
- All `Bun.build` options (`entrypoints`, `outdir`, `minify` object form, `splitting`, `sourcemap: "external"`, `target: "bun"`, `define`) and the `BuildArtifact.path`/`.size` properties are valid per the official bundler reference.
- All `bun:sqlite` usage (`Database`, `PRAGMA journal_mode = WAL`, `prepare` with `$name` parameters, `transaction()`) matches the official `bun:sqlite` documentation.
