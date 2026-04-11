# Validation Summary: How to Use Redis with HAProxy for Session Persistence

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (server and CLI)
- HAProxy (load balancer configuration)
- Node.js with Express
- express-session
- connect-redis (v7+)
- node-redis (v4+)

## Sources Consulted
- HAProxy configuration manual — cookie directive, server directive, balance algorithms (https://docs.haproxy.org/dev/configuration.html)
- connect-redis v7 README and API (https://github.com/tj/connect-redis)
- node-redis v4 client documentation (https://github.com/redis/node-redis)
- express-session documentation (https://github.com/expressjs/session)
- Redis CLI command reference — KEYS, GET, TTL (https://redis.io/docs/latest/commands/)
- Redis configuration — bind directive and protected-mode (https://redis.io/docs/latest/operate/oss_and_stack/management/config/)

## Issues Found
1. **Top-level `await` in CommonJS module**: The Node.js code used `require()` (CommonJS) but had a bare `await client.connect()` at the top level. Top-level `await` is only valid in ES modules (`.mjs` or `"type": "module"` in package.json). This would cause a `SyntaxError` if saved as a `.js` file in a default Node.js project. Fixed by wrapping the code in an async IIFE `(async () => { ... })();`.

## Review Notes
- The Redis setup section binds to `0.0.0.0` without mentioning `requirepass` or `protected-mode`. In Redis 6+, protected mode blocks unauthenticated external connections by default, so the setup is safe out of the box, but a production deployment should set a password. This is not an error but worth noting for readers.
- The `sed` command targets `bind 127.0.0.1`, but Redis 6+ defaults to `bind 127.0.0.1 -::1`. The sed substitution would produce `bind 0.0.0.0 -::1`, which is functional (binds all IPv4, no IPv6 localhost) but may surprise readers. Not incorrect, just version-sensitive.
- The HAProxy configuration, connect-redis API usage, express-session options, and Redis CLI commands are all correct and current.
