# Validation Summary: How to Use GETEX in Redis to Get a Value and Set Expiration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (6.2+)
- GETEX command
- Key expiration (TTL, EX, PX, EXAT, PXAT, PERSIST)

## Sources Consulted
- Official Redis GETEX documentation: https://redis.io/docs/latest/commands/getex/
- Redis command reference for SET, GET, TTL, PTTL, EXPIRE
- Unix timestamp verification via system date utilities

## Issues Found
- **Incorrect Unix timestamp for EXAT example**: The blog used `EXAT 1751328000` and described the output as `<seconds until 2026-07-01>`. However, Unix timestamp `1751328000` corresponds to **2025-07-01 00:00:00 UTC**, not 2026-07-01. This would be a date in the past relative to the blog's publication date (2026-03-31), making it nonsensical as an expiration target. Fixed the timestamp to `1782864000`, which correctly corresponds to 2026-07-01 00:00:00 UTC.

## Review Notes
- All GETEX syntax, options (EX, PX, EXAT, PXAT, PERSIST), and return values are accurate per the official Redis documentation.
- The claim that GETEX was introduced in Redis 6.2 is confirmed (Redis Open Source 6.2.0).
- The atomicity claim is correct — Redis executes single commands atomically due to its single-threaded execution model, so GETEX eliminates the GET + EXPIRE race condition as described.
- The flowchart and sequence diagram accurately represent GETEX behavior and the race condition it solves.
- The note that GETEX without options is "equivalent to GET" is functionally correct, though technically GETEX is classified as a write command while GET is read-only. This distinction only matters for replication and ACL purposes, not for the blog's audience.
- All example outputs are realistic and consistent with expected Redis behavior.
