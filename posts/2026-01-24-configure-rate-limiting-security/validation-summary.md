# Validation Summary: How to Configure Rate Limiting for Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NGINX rate limiting
- Express.js
- Node.js
- Redis sorted sets
- Redis Lua scripting
- API security and rate limit headers

## Sources Consulted
- NGINX ngx_http_limit_req_module documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- NGINX ngx_http_limit_conn_module documentation: https://nginx.org/en/docs/http/ngx_http_limit_conn_module.html
- Express 5.x API Reference: https://expressjs.com/en/api/
- Express behind proxies guide: https://expressjs.com/en/guide/behind-proxies/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis ZREMRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zremrangebyscore/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- ioredis official documentation: https://github.com/redis/ioredis

## Issues Found
- The NGINX password reset rate used `rate=3r/h`, but official NGINX `limit_req_zone` syntax supports rates in requests per second (`r/s`) or requests per minute (`r/m`), not requests per hour. Changed the example to `rate=1r/m` and updated the comment.
- The Redis sliding-window limiter used a pipeline for cleanup, count, add, and expiry. Pipelining batches commands but does not make the check-and-add operation atomic across concurrent clients. Replaced the pipeline with a Redis Lua script so the cleanup, count, and insert happen atomically.
- The limiter removed a just-added request with `ZREMRANGEBYSCORE key now now` after detecting an exceeded limit. That could remove other same-millisecond requests with the same score. The Lua version checks the count before inserting, so no rollback removal is needed.
- The rate limit reset and retry values were based on a full window from the current request rather than the Redis key state. Updated the code to return `retryAfter` and `resetAt` from the limiter result and use those values in response headers.
- The Express route sample read `req.body.email` without first installing JSON body parsing middleware. Added `app.use(express.json())`.
- The Express key generators directly accessed `req.body.email`; this could throw if a request had no parsed body. Updated those examples to use optional chaining.

## Review Notes
- The JavaScript examples were syntax checked with `node --check` on Node.js v22.22.0.
- The NGINX snippet was reviewed against official directive syntax. It was not executed locally because the sample references an illustrative `backend` upstream.
- In a production Express deployment behind a proxy, `trust proxy` should be configured carefully so `req.ip` reflects the intended client address and cannot be spoofed through untrusted `X-Forwarded-For` values.
