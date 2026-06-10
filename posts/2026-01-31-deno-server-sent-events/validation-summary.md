# Validation Summary: How to Build Server-Sent Events in Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno runtime (`Deno.serve`, `Deno.serve` HTTP server)
- Server-Sent Events (SSE) protocol (`text/event-stream`)
- Web platform APIs: `ReadableStream`, `TextEncoder`, `TextDecoder`, `EventSource`, `BroadcastChannel`, `crypto.randomUUID()`, `AbortSignal`
- TypeScript
- HTML/JavaScript client (browser EventSource)
- HTTP/1.1 and HTTP/2 semantics (Last-Event-ID, Cache-Control, retry header)

## Sources Consulted
- WHATWG HTML Living Standard, Server-Sent Events section — https://html.spec.whatwg.org/multipage/server-sent-events.html
- Deno runtime HTTP server guide — https://docs.deno.com/runtime/fundamentals/http_server/
- Deno API: `Deno.serve` — https://docs.deno.com/api/deno/~/Deno.serve
- Deno API: `BroadcastChannel` — https://docs.deno.com/api/web/~/BroadcastChannel
- MDN: `EventSource` API — https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- MDN: Using server-sent events — https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events

## Issues Found
- **BroadcastChannel scope was overstated.** The "Scaling SSE for Production" section originally claimed BroadcastChannel "Enables event distribution across multiple server instances." Per Deno's documentation, vanilla `BroadcastChannel` only spans Workers/isolates within a single Deno process; cross-instance behavior is only available on Deno Deploy. I updated the inline comment to clarify that the pattern works globally on Deno Deploy, only spans Workers in standalone Deno, and that multi-process self-hosted deployments need an external broker (Redis Pub/Sub, NATS, etc.). No other code changes were necessary.

## Review Notes
- `Deno.serve({ port, ... }, handler)` is the correct, stable form in current Deno (stabilized in Deno 1.35+, and the recommended HTTP API in Deno 2.x). All examples use it correctly.
- `request.signal` from `Deno.serve` handlers does fire `abort` when the client disconnects; the cleanup pattern with `clearInterval` and `controller.close()` is correct.
- SSE wire format is implemented correctly throughout: `data:` lines, `event:` for named types, `id:` for resume support, `retry:` in milliseconds, `:` comment lines used as heartbeat keep-alives, and double-newline event terminators.
- `Last-Event-ID` header on automatic reconnection is correctly described and consumed via `request.headers.get("Last-Event-ID")`.
- The `EventSource` API limitations are accurately described: no custom headers, hence the documented workarounds (query token, cookie, or `fetch` + `ReadableStream`).
- The strict SSE spec says only a single leading U+0020 SPACE should be stripped after the field colon; `parseSSEEvent` uses `.trim()` which is slightly more permissive. This is harmless in practice and consistent with most third-party SSE parsers, so left as-is.
- `Connection: keep-alive` has no effect under HTTP/2 (it is HTTP/1.1-specific), but including it is harmless and standard in SSE examples; not changed.
- The `dashboardHTML` constant is referenced inside a handler defined earlier in the file. This relies on the const being initialized by the time the first request arrives — fine at runtime, slightly awkward stylistically, but not a correctness issue.
- Modifying the `clients` Set while iterating it in `broadcastToLocalClients` is permitted by the ECMAScript Set iteration semantics, so the pattern is safe.
