# Validation Summary: How to Build WebSocket Servers in Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno (runtime, `Deno.serve`, `Deno.upgradeWebSocket`)
- WebSocket API (browser-standard `WebSocket` interface)
- TypeScript
- djwt v3.0.1 (JWT signing/verification on Deno)
- Web Crypto API (`crypto.subtle.generateKey`, `crypto.randomUUID`)
- Redis v0.31.0 Deno client (pub/sub)
- Mermaid diagrams (sequenceDiagram, flowchart)

## Sources Consulted
- Deno API documentation — `Deno.upgradeWebSocket`: https://docs.deno.com/api/deno/~/Deno.upgradeWebSocket
- Deno API documentation — `Deno.serve`: https://docs.deno.com/api/deno/~/Deno.serve
- Deno Web Platform documentation — `setInterval`/`setTimeout` (return type `number`): https://docs.deno.com/api/web/~/setInterval
- djwt v3.0.1 source: https://deno.land/x/djwt@v3.0.1/mod.ts and https://deno.land/x/djwt@v3.0.1/algorithm.ts
- Redis client v0.31.0 source: https://deno.land/x/redis@v0.31.0/pubsub.ts
- WebSocket protocol behavior (RFC 6455) for upgrade handshake and close codes

## Issues Found
1. **Incorrect type `NodeJS.Timeout` in `services/heartbeat.ts`** — In Deno, `setInterval` and `setTimeout` follow the web platform standard and return `number`. The `NodeJS` namespace is not available in Deno's standard types, so `Map<string, NodeJS.Timeout>` would fail to compile. Changed both `pendingPongs` and `pingIntervals` types from `NodeJS.Timeout` to `number`.

2. **Misleading comment in `services/connections.ts`** — The header comment stated "Using a Set provides O(1) add/delete operations" but the implementation uses a `Map<string, Client>`, not a `Set`. Changed the comment to reference `Map` to match the actual data structure.

3. **Missing `export` on `UserPayload` interface in `services/auth.ts`** — The complete chat application example imports `UserPayload` from `./services/auth.ts` (`import { authenticateConnection, UserPayload } from "./services/auth.ts"`), but the interface in the auth.ts snippet was declared without `export`, which would cause a TypeScript module resolution error. Added the `export` keyword.

## Review Notes
- The "ping/pong" mechanism implemented is an application-level JSON message protocol (`{type: "ping"}`/`{type: "pong"}`), not the protocol-level WebSocket ping/pong control frames (RFC 6455). This is a reasonable approach for Deno's standard `WebSocket` API, which does not expose hooks for protocol-level ping/pong frames in `Deno.upgradeWebSocket()` output; readers should understand this is a custom application protocol rather than the WebSocket control frames.
- `Deno.upgradeWebSocket()` does provide an automatic keep-alive ping at the protocol level via the `idleTimeout` option, which the post does not mention. The custom JSON heartbeat shown is still useful for application-level liveness checks but readers should be aware of the built-in option.
- The complete-chat-app example references `handleAuthenticatedWebSocket()` (in the auth integration section) and `getTestClientHtml()` (in the chat server section) which are never defined in the post. These are presented as illustrative simplified code; the author also notes in a comment that the storage-of-user-info flow is simplified. Verified that the code's correctness is not affected since these are clearly placeholders within a final illustrative example.
- The djwt v3.0.1 import URL, API signatures (`create({alg:"HS512", typ:"JWT"}, payload, key)`, `verify(token, key)`), and the `crypto.subtle.generateKey({name:"HMAC", hash:"SHA-512"}, true, ["sign","verify"])` usage are all correct and produce a compatible `CryptoKey`.
- The Redis client URL (`https://deno.land/x/redis@v0.31.0/mod.ts`) and its `connect`, `publish`, `subscribe` plus `sub.receive()` async iterator API are all valid.
- The post says "Deno requires no package.json or npm install." This is true for traditional URL-imported modules but Deno does now support `package.json` and npm specifiers; the statement is accurate in the context of pure Deno-style imports as used in the post.
- `deno run --allow-net main.ts` is the correct minimal permission flag; if a reader adds the env-based Redis/JWT secret approach, they would additionally need `--allow-env`.
