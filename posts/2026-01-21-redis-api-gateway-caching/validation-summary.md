# Validation Summary: How to Use Redis for API Gateway Caching

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Redis
- redis-py
- Flask
- aiohttp
- Python requests
- HTTP caching and stale-while-revalidate
- API gateway response caching, request coalescing, response aggregation, and tag-based invalidation

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- Flask request context documentation: https://flask.palletsprojects.com/en/stable/reqcontext/
- aiohttp client reference: https://docs.aiohttp.org/en/stable/client_reference.html
- aiohttp client quickstart, timeout section: https://docs.aiohttp.org/en/stable/client_quickstart.html#timeouts
- Requests quickstart documentation: https://requests.readthedocs.io/en/latest/user/quickstart/
- RFC 5861, HTTP Cache-Control Extensions for Stale Content: https://datatracker.ietf.org/doc/html/rfc5861

## Issues Found
- Redis `SETEX` was used in several examples. Redis documents `SETEX` as deprecated since Redis 2.6.12 and recommends `SET` with the `EX` argument for new code. Updated all examples from `setex(...)` to `set(..., ex=...)`.
- The request coalescing example used `hashlib.sha256(...)` without importing `hashlib` in that code block. Added the missing import.
- The stale-while-revalidate example used `requests.get(...)` without importing `requests` in that code block. Added the missing import.

## Review Notes
- The examples are illustrative gateway patterns rather than production-ready middleware. Production systems should add Redis error handling around cache operations, more robust Cache-Control parsing, response body handling for non-JSON responses, distributed locking for cross-process stale revalidation, and cleanup of tag sets whose members have expired.
- Redis Pub/Sub has at-most-once delivery semantics, so the request coalescing example correctly stores the result in a Redis key in addition to publishing a notification.
