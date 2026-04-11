# Validation Summary: How to Implement Request Deduplication Across Services with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SET with NX and EX options, EXISTS)
- Python 3 (redis-py client library)
- FastAPI (Header parameters, async endpoints)
- Stripe webhooks (event deduplication pattern)

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/ — verified NX and EX flags syntax and behavior
- redis-py documentation: https://redis-py.readthedocs.io/ — verified `set()` method kwargs (`nx`, `ex`) and return values (`True` on success, `None` when NX condition fails)
- Python `enum` module documentation: https://docs.python.org/3/library/enum.html — verified `str, Enum` mixin behavior for JSON serialization and string comparison
- Python `hashlib` documentation: https://docs.python.org/3/library/hashlib.html — verified `sha256().hexdigest()` API
- FastAPI Header parameters documentation: https://fastapi.tiangolo.com/tutorial/header-params/ — verified `Header(None, alias=...)` usage for hyphenated header names

## Issues Found
No technical issues found.

## Review Notes
- The core deduplication logic has a fallthrough path: if the stored value is neither "processing" nor valid JSON (corrupted state), the code re-executes the handler without holding the NX lock. This is a reasonable recovery mechanism but worth noting as a design trade-off.
- The FastAPI endpoint example uses dual-layer caching (endpoint-level cache keyed by client-provided idempotency key, plus the core dedup layer keyed by param hash). This is redundant but not harmful — the core dedup SET NX prevents actual double processing regardless.
- The message queue dedup pattern does not delete the key on failure (unlike the webhook pattern), meaning failed messages won't be retried. This is a valid "at-most-once" design choice that matches the "exactly once" comment, though in practice retry-on-failure may be preferred.
