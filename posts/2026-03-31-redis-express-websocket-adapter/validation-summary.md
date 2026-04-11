# Validation Summary: How to Build Express.js WebSocket Server with Redis Adapter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Pub/Sub)
- Express.js
- Socket.IO (v4)
- @socket.io/redis-adapter
- node-redis (v4+)
- Node.js

## Sources Consulted
- Socket.IO Redis adapter documentation: https://socket.io/docs/v4/redis-adapter/
- @socket.io/redis-adapter GitHub repository and README
- node-redis (redis npm package) documentation and source code for `createClient`, `duplicate()`, and `connect()` APIs
- Redis CLI documentation for `PUBSUB CHANNELS` and `PUBSUB NUMSUB` commands

## Issues Found

### 1. Top-level `await` used with CommonJS `require()` syntax
- **What was wrong:** The "Configure the Redis Adapter" code block used `require()` (CommonJS module syntax) but had `await Promise.all(...)` at the top level. Top-level `await` is only valid in ES modules (`.mjs` files or `"type": "module"` in `package.json`). Using it in a CommonJS context is a syntax error.
- **What was changed:** Replaced `await Promise.all([pubClient.connect(), subClient.connect()])` with `Promise.all([pubClient.connect(), subClient.connect()]).then(() => { ... })`, wrapping the `io.adapter()` call inside the `.then()` callback. This is consistent with the CommonJS `require()` syntax used throughout the post.
- **Why:** The original code would throw a `SyntaxError` at runtime in a CommonJS Node.js environment. The `.then()` pattern is the idiomatic approach for async initialization in CommonJS and matches patterns shown in official Socket.IO documentation.

### 2. Incorrect Redis channel name in `pubsub numsub` command
- **What was wrong:** The command `redis-cli pubsub numsub "socket.io#/"` used an incorrect channel name. The @socket.io/redis-adapter constructs channel names as `<prefix>#<namespace>#`, so the default namespace `/` produces the channel `socket.io#/#` (with a trailing `#`).
- **What was changed:** Updated the command to `redis-cli pubsub numsub "socket.io#/#"`.
- **Why:** The original command would return 0 subscribers because it didn't match the actual channel name used by the adapter.

## Review Notes
- The code snippets are presented as separate fragments rather than a single complete file. The `httpServer.listen()` call is not shown in any snippet, though it is implied by the "Scale with Multiple Instances" section which runs `node server.js` on different ports. Readers assembling a working file will need to add this themselves.
- The client-side snippet assumes the Socket.IO client library is already loaded (e.g., via `<script>` tag or bundler import). This is standard for tutorial snippets.
- All npm package names (`express`, `socket.io`, `@socket.io/redis-adapter`, `redis`) are correct and current.
- The `createAdapter(pubClient, subClient)` API, `createClient()` with URL option, and `.duplicate()` method are all verified correct for current versions of these packages.
