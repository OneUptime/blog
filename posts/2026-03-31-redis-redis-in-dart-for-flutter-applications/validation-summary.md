# Validation Summary: How to Use Redis in Dart for Flutter Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Dart (server-side)
- Flutter (client-side architecture)
- resp_client Dart package
- Shelf / Dart Frog (mentioned as backend frameworks)
- WebSocket / HTTP (communication layer)

## Sources Consulted
- pub.dev package page for resp_client (https://pub.dev/packages/resp_client) — verified version, API surface, class names
- resp_client package source and API documentation — verified class hierarchy (RespCommandsTier0, RespCommandsTier1, RespCommandsTier2), method signatures, and import paths
- Redis RESP protocol specification — verified Pub/Sub message format (arrays of bulk strings)

## Issues Found

### 1. Non-existent `RespCommands` class (Critical)
**What was wrong:** The blog used `RespCommands(client)` throughout, but this class does not exist in the `resp_client` package. The package uses a tiered command system: `RespCommandsTier0` (raw execute), `RespCommandsTier1` (returns RespType), and `RespCommandsTier2` (returns Dart types).
**What was changed:** Replaced `RespCommands(client)` with `RespCommandsTier2(client)` in the connection section and caching pattern. Used `RespCommandsTier0(client)` in sections requiring raw `execute()` calls.

### 2. Mixed tier method usage in Basic Operations (Critical)
**What was wrong:** The basic operations example called both `commands.set('counter', '0')` (a Tier2 convenience method) and `commands.execute([...])` (a Tier0 method) on the same object. The `execute()` method is only available on `RespCommandsTier0`, not `RespCommandsTier2`.
**What was changed:** Changed the function to accept `RespClient`, create a `RespCommandsTier0` instance, and use `execute()` for all operations including the initial SET.

### 3. Mixed tier usage in Caching Pattern (Critical)
**What was wrong:** The caching function used `redis.get()` (Tier2) and `redis.execute()` (Tier0) on the same `RespCommands` object (which doesn't exist).
**What was changed:** Changed parameter to `RespClient`, created `RespCommandsTier2` for `get()` and `RespCommandsTier0` for the raw `SET` with `EX` expiry option.

### 4. Incorrect Pub/Sub API (Critical)
**What was wrong:** The Pub/Sub example used `client.writeCommand([...])` and `client.listen`, neither of which exist on `RespClient`. `writeCommand()` is not a method on `RespClient`, and `.listen` is not a property.
**What was changed:** Used `RespCommandsTier0.execute()` to send the SUBSCRIBE command and `client.outputStream` to listen for incoming messages.

### 5. Updated Summary section
**What was changed:** Added a sentence explaining the tiered command class system (`RespCommandsTier2` for high-level ops, `RespCommandsTier0` for raw commands) so readers understand the architecture.

## Review Notes
- The `resp_client` package (latest version 1.2.0) was last published approximately 5 years ago. While functional, developers may want to evaluate whether it is actively maintained for production use.
- The version constraint `^1.1.0` in pubspec.yaml is valid and will resolve to versions 1.1.0 through 1.2.0.
- The import paths, `connectSocket()` function, `RespClient` constructor, and `server.close()` were all verified as correct.
- The architectural guidance (Redis in backend, Flutter communicates via HTTP/WebSocket) is sound and correctly presented.
- The Pub/Sub section uses `client.outputStream` for the message stream — the exact stream API name may vary between package versions. Developers should consult the package API docs for their installed version.
