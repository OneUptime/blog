# Validation Summary: How to Implement Weekly Summary with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (key-value store, pipelines, hashes, TTL)
- Python 3 (redis-py client library)
- ISO 8601 week numbering (`datetime.isocalendar()`)

## Sources Consulted
- Python `datetime.datetime.utcfromtimestamp()` documentation: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcfromtimestamp
- Python `datetime.datetime.timestamp()` documentation: https://docs.python.org/3/library/datetime.html#datetime.datetime.timestamp — confirms that `.timestamp()` on naive datetimes assumes local timezone, not UTC.
- Python `calendar.timegm()` documentation: https://docs.python.org/3/library/calendar.html#calendar.timegm — converts a UTC time tuple to a POSIX timestamp.
- Python `datetime.date.isocalendar()` documentation: https://docs.python.org/3/library/datetime.html#datetime.date.isocalendar
- redis-py documentation for `pipeline()`, `hset()`, `set()`, `get()`, `expire()`, `exists()`: https://redis-py.readthedocs.io/en/stable/
- Redis commands reference: https://redis.io/commands

## Issues Found

### 1. Incorrect UTC-to-timestamp conversion using `.timestamp()` on naive datetimes (2 occurrences)

**What was wrong:** The `rollup_week()` and `rollup_week_with_stats()` functions both created naive datetimes via `datetime.datetime.utcfromtimestamp()` and then called `.timestamp()` to convert back to a Unix timestamp. Per the Python docs, `.timestamp()` on a naive datetime assumes the **local timezone**, not UTC. This means on any server not configured to UTC, `monday_ts` would be offset by the local timezone difference, causing the wrong daily keys to be looked up.

**What was changed:** Replaced `.timestamp()` with `calendar.timegm(...timetuple())` in both functions, and added `import calendar` to the imports block. `calendar.timegm()` explicitly interprets the time tuple as UTC, which matches the UTC-based datetime created by `utcfromtimestamp()`.

**Why:** This was a silent correctness bug. The code would appear to work on UTC servers but produce wrong weekly rollups on servers in other timezones (e.g., US Eastern, IST).

## Review Notes
- `datetime.datetime.utcfromtimestamp()` is deprecated since Python 3.12 in favor of `datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)`. The code still works but will emit a DeprecationWarning on Python 3.12+. Not changed since the blog doesn't target a specific Python version and it remains functional.
- The `week_bucket()` and `day_bucket()` helper functions treat `ts=0` (Unix epoch) as falsy due to `ts = ts or time.time()`, which would silently use the current time instead. This is unlikely to matter in practice for a weekly summary use case.
- The `rollup_week()` function uses `r.exists()` followed by `r.get()` — two round trips where a single `r.get()` with a None check would suffice. This is a minor efficiency concern, not a correctness issue.
- The `change_pct` calculation uses `max(last_count, 1)` to avoid division by zero. When `last_count` is 0, this reports the absolute delta as the percentage, which is pragmatic but mathematically imprecise (percentage change from zero is undefined).
