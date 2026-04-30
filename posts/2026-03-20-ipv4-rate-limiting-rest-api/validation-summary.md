# Validation Summary: How to Implement IPv4 Address-Based Rate Limiting in REST APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HTTP rate limiting
- IPv4/client IP extraction behind proxies
- Python
- Flask
- Werkzeug `ProxyFix`
- Redis
- redis-py
- Node.js
- Express
- `express-rate-limit`
- `rate-limit-redis`
- `node-redis`

## Sources Consulted
- Flask deployment docs: https://flask.palletsprojects.com/en/stable/deploying/proxy_fix/
- Express proxy docs: https://expressjs.com/en/guide/behind-proxies.html
- Redis `EXPIRE` command docs: https://redis.io/docs/latest/commands/expire/
- Redis `TTL` command docs: https://redis.io/docs/latest/commands/ttl/
- Redis `EVAL` command docs: https://redis.io/docs/latest/commands/eval/
- redis-py Lua scripting docs: https://redis.readthedocs.io/en/v6.3.0/lua_scripting.html
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html
- node-redis connection docs: https://redis.io/docs/latest/develop/clients/nodejs/connect/
- `express-rate-limit` configuration docs: https://express-rate-limit.mintlify.app/reference/configuration
- `express-rate-limit` official package README: https://www.npmjs.com/package/express-rate-limit
- `rate-limit-redis` official package README: https://www.npmjs.com/package/rate-limit-redis

## Issues Found
- The description claimed the post covered token bucket rate limiting, but the examples actually implement sliding window and fixed-window approaches. I corrected the description to match the code.
- Both Flask examples trusted `X-Forwarded-For` directly. Flask/Werkzeug recommends trusting forwarded headers only through configured proxy middleware. I updated both snippets to use `ProxyFix` and `request.remote_addr`.
- The Redis/Flask example called `EXPIRE` on every request, which turns the counter into an inactivity-based window and can let counts accumulate incorrectly under steady traffic. I replaced that logic with an atomic Lua script that sets expiry only on the first hit in the window and also returns the remaining TTL.
- The Redis/Flask snippet returned a constant `Retry-After` value. I changed it to use the remaining TTL for the active window and added `X-RateLimit-Reset` as a Unix timestamp so the header section matches the code more closely.
- The Node.js example used outdated or mismatched current-package patterns: CommonJS default imports for `express-rate-limit` and `rate-limit-redis`, the legacy `max` option name, and an un-awaited Redis connection. I updated it to current CommonJS named imports, `limit`, and an async startup flow that awaits `client.connect()`.
- The Node.js example’s header comment said `standardHeaders: true` returns `X-RateLimit-*` headers, which is incorrect in current `express-rate-limit`. I switched the example to explicit legacy headers to match the article’s header table and updated the comment accordingly.

## Review Notes
- `express-rate-limit` currently recommends the newer `standardHeaders` option over legacy `X-RateLimit-*` headers, but the article now consistently uses the legacy header set across examples, which is still supported.
- The in-memory Flask example is still intentionally single-process and single-instance only; it remains unsuitable for multi-process or multi-replica production deployments, which the post already explains.
