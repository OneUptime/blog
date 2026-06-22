# Validation Summary: How to Implement Idempotency Keys with Redis

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Redis
- Redis Lua scripting
- redis-py
- Python
- Flask
- FastAPI
- Node.js
- ioredis
- Express
- Stripe idempotency keys
- HTTP idempotent methods

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- ioredis official documentation: https://github.com/redis/ioredis
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- FastAPI middleware documentation: https://fastapi.tiangolo.com/tutorial/middleware/
- Express response API documentation: https://expressjs.com/en/5x/api/response/
- Stripe idempotent requests documentation: https://docs.stripe.com/api/idempotent_requests
- RFC 9110 HTTP Semantics, idempotent methods: https://datatracker.ietf.org/doc/html/rfc9110#section-9.2.2

## Issues Found
- The description claimed idempotency keys ensure "exactly-once processing." This overstates the guarantee: idempotency prevents duplicate side effects or replays stored results, but execution may still happen more than once in failure scenarios. Changed the wording to "avoiding duplicate side effects."
- The HTTP method summary grouped POST, PUT, and DELETE together as methods that may need idempotency keys. RFC 9110 defines PUT and DELETE as idempotent methods, while POST is not inherently idempotent. Updated the wording to distinguish POST from PUT/DELETE and explain when keys are still useful for PUT/DELETE.
- The Redis Lua scripts stored `created_at` from `ARGV[1]` as a string. The Python code later subtracted it from `time.time()`, which would raise a type error. Changed the Lua scripts to store `created_at = tonumber(ARGV[1])`.
- The Python stale-processing retry path set `is_new = True` locally without atomically reclaiming the Redis key. Multiple workers could therefore retry the same stale operation concurrently. Added an atomic Lua-based `reclaim_processing` method and updated retry handling to use it.
- The Python `complete` and `fail` methods replaced the original `created_at` timestamp with a new timestamp. Updated them to preserve the existing creation time and set only `completed_at` to the current time.
- The Flask decorator attempted to cache arbitrary Flask return values, including response objects, which are not JSON-serializable in the Redis record. Updated it to normalize JSON endpoint responses with `make_response`, store the JSON payload, and replay it with `jsonify`.
- The FastAPI middleware marked requests as processing but never stored successful responses, so later duplicate requests would remain in conflict until expiration. Updated it to capture JSON response bodies, complete the idempotency record, and replay failed records consistently.
- The Node.js Lua script also stored `created_at` as a string. Updated it to use `tonumber(ARGV[1])`.
- The Node.js test destructured `existing` without declaring it. Updated the first destructuring assignment to declare both `isNew` and `existing`.

## Review Notes
The examples now parse successfully: all Python fenced code blocks compile with `python3`, and the JavaScript block passes `node --check`. The examples remain simplified for tutorial purposes; a production implementation should also store and replay status codes and selected response headers, validate that repeated keys use the same request payload, and decide explicitly whether failed responses should be cached or allowed to retry.
