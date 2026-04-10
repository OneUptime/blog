# Validation Summary: How to Implement Monthly Archive with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (key-value store, pipelines, hashes, TTL/expire)
- Python 3 (redis-py client library)
- datetime and time standard library modules

## Sources Consulted
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html — specifically `utcfromtimestamp` deprecation (since 3.12), `fromtimestamp` with timezone, and naive vs aware datetime `.timestamp()` behavior
- Python `time` documentation: https://docs.python.org/3/library/time.html — `gmtime`, `strftime`
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/ — `get`, `set`, `expire`, `exists`, `hset`, `persist`, `pipeline`
- Redis commands documentation: https://redis.io/commands/ — EXPIRE, SET, GET, HSET, PERSIST, EXISTS

## Issues Found

### 1. Timezone bug in `rollup_month` — naive datetime `.timestamp()` vs UTC
**What was wrong:** `datetime.datetime(year, mon, 1).timestamp()` creates a naive datetime and `.timestamp()` interprets it as local time. But `day_bucket()` uses `time.gmtime()` which works in UTC. On servers not running in UTC, `first_day_ts` would be offset, causing `day_bucket()` to potentially return wrong day keys (e.g., Feb 28 instead of Mar 1 in UTC+ timezones).
**What was changed:** Replaced with `datetime.datetime(year, mon, 1, tzinfo=datetime.timezone.utc).timestamp()` so the timestamp is unambiguously UTC.

### 2. Timezone bug in `month_over_month` — same naive `.timestamp()` issue
**What was wrong:** `last_dt = datetime.datetime(dt.year, dt.month - 1, 1)` followed by `last_dt.timestamp()` had the same local-time interpretation issue. On non-UTC servers, `month_bucket(last_dt.timestamp())` could return the wrong month string.
**What was changed:** Added `tzinfo=datetime.timezone.utc` to both `last_dt` construction paths (January and non-January branches).

### 3. Deprecated `datetime.datetime.utcfromtimestamp()` (3 occurrences)
**What was wrong:** `utcfromtimestamp()` is deprecated since Python 3.12 and returns a naive datetime that represents UTC but is not timezone-aware, which contributed to the `.timestamp()` bugs above.
**What was changed:** Replaced all three occurrences (in `rollup_month`, `month_over_month`, `get_monthly_history`) with `datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)`.

### 4. Unused variable in `get_monthly_history`
**What was wrong:** `results = []` was declared but never used — the function builds its return value via a list comprehension instead.
**What was changed:** Removed the unused `results = []` line.

## Review Notes
- The `r.persist(archive_key)` call in `archive_year` is technically a no-op since newly created keys have no TTL by default, but it documents intent clearly so was left as-is.
- The `r.exists()` + `r.get()` pattern in `rollup_month` has a theoretical race condition (key could expire between the two calls), but this is a standard Redis tutorial pattern and the window is negligible.
- The `change_pct` calculation uses `max(last_count, 1)` to avoid division by zero, which reports 100% per unit when last month is 0 — a common convention but worth noting for precision-sensitive use cases.
- The `5 * 365 * 86400` TTL (5 years) doesn't account for leap years, but the ~1-day discrepancy over 5 years is inconsequential for this use case.
