# Validation Summary: How to Connect to Redis from Node.js with node-redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Node.js
- node-redis (npm package `redis`) v5.x

## Sources Consulted
- node-redis GitHub repository: https://github.com/redis/node-redis
- node-redis configuration documentation: https://github.com/redis/node-redis/blob/master/docs/client-configuration.md
- Redis official Node.js connect guide: https://redis.io/docs/latest/develop/clients/nodejs/
- node-redis v5 migration notes and CHANGELOG

## Issues Found

### 1. Deprecated `quit()` and `disconnect()` methods
- **What was wrong:** The "Closing the Connection" section used `client.quit()` and `client.disconnect()`, which are deprecated in node-redis v5.x (the current version installed by `npm install redis`).
- **What was changed:** Replaced `client.quit()` with `client.close()` and `client.disconnect()` with `client.destroy()`.
- **Why:** In node-redis v5, `quit()` was renamed to `close()` and `disconnect()` was renamed to `destroy()`. The old methods still exist but are marked `@deprecated`. Since the post does not pin a version and `npm install redis` installs v5.x, the code should use the current API.

### 2. Misleading code comment in reconnection strategy
- **What was wrong:** The code comment said "Exponential backoff capped at 3 seconds" but the actual expression `retries * 100` produces linear growth (100ms, 200ms, 300ms, ...), not exponential.
- **What was changed:** Changed the comment from "Exponential backoff" to "Linear backoff".
- **Why:** The comment was inaccurate. The default built-in strategy uses exponential backoff, but the custom example shown uses linear backoff. The mismatch could confuse readers.

## Review Notes
- The `reconnectStrategy` callback also receives a second parameter `cause` (the Error that triggered the reconnection). The blog only shows `retries`, which is valid JavaScript but omits potentially useful information. This is not an error, just an incomplete signature.
- The Pub/Sub `subscribe` callback receives `(message, channel)` but the example only destructures `message`. This works correctly and is fine for a minimal example.
- The singleton pattern example does not handle the case where the client disconnects after initial creation (the `client` variable would still be truthy). This is a design consideration rather than a bug, and is acceptable for a tutorial-level example.
