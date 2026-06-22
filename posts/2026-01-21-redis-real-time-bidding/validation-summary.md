# Validation Summary: How to Build a Real-Time Bidding System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Redis Lua scripting
- redis-py
- redis.asyncio
- FastAPI
- Pydantic
- WebSocket
- JavaScript Fetch API

## Sources Consulted
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis HMSET command documentation: https://redis.io/docs/latest/commands/hmset/
- Redis HGETALL command documentation: https://redis.io/docs/latest/commands/hgetall/
- Redis async Python client documentation: https://redis.io/docs/latest/develop/clients/redis-py/async/
- redis-py asyncio examples: https://redis.readthedocs.io/en/stable/examples/asyncio_examples.html
- FastAPI request body documentation: https://fastapi.tiangolo.com/tutorial/body/

## Issues Found
- The Lua script used `HGETALL` and then read fixed array positions for `bidder_id` and `max_bid`. `HGETALL` returns field/value pairs, but relying on fixed positions is not a safe way to read specific fields. Changed the script to use `HGET` for each auto-bid field directly.
- The Lua script used `HMSET`, which Redis marks as deprecated as of Redis 4.0.0. Replaced it with multi-field `HSET`.
- The WebSocket/FastAPI example imported `aioredis`; current Redis Python documentation uses the `redis.asyncio` namespace. Updated the import and connection creation accordingly.
- The FastAPI endpoint passed an async Redis client into the synchronous `BidService` and called async Redis operations without `await`. Added an `AsyncBidService` wrapper that awaits the registered Lua script, `hget`, and `publish` calls.
- The FastAPI endpoint declared `bidder_id`, `amount`, and `max_auto_bid` as scalar parameters, which FastAPI treats as query parameters by default. The frontend sends JSON, so added a Pydantic `BidRequest` body model and updated the endpoint to use it.
- The WebSocket code block used `json`, `time`, and `uuid` without importing them. Added the missing imports.
- The initial WebSocket auction state omitted `min_increment`, causing the frontend to fall back to `1` even when the auction had a different increment. Added `min_increment` to the initial state payload.
- The frontend used an inline `onclick="auction.placeBid()"` handler that depends on a global variable. Replaced it with an event listener attached during render.

## Review Notes
Python and JavaScript snippets were syntax-checked locally. The local environment did not have `redis` or `fastapi` installed, so runtime API validation for those libraries was performed against official documentation.
