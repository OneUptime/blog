# How to Use PFMERGE in Redis to Merge HyperLogLogs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, HyperLogLog, PFMERGE, Analytics, Cardinality

Description: Learn how to use PFMERGE to combine multiple Redis HyperLogLog structures into one, enabling efficient aggregation of unique-count data across time periods or segments.

---

## What Is PFMERGE?

`PFMERGE` combines multiple HyperLogLog data structures into a single destination key. The result represents the union of all input HyperLogLogs - the estimated cardinality of all unique elements that appeared in any of the source keys. Unlike `PFCOUNT` with multiple keys (which computes the union on the fly without storing it), `PFMERGE` persists the merged result for future queries.

## Syntax

```text
PFMERGE destkey sourcekey [sourcekey ...]
```

- `destkey` - the key where the merged HyperLogLog is stored (created or overwritten)
- `sourcekey [sourcekey ...]` - one or more source HyperLogLog keys to merge

Always returns `OK`.

## Basic Usage

```bash
# Daily unique visitor HyperLogLogs
PFADD visitors:2026-01-01 user:101 user:102 user:103
PFADD visitors:2026-01-02 user:102 user:104 user:105
PFADD visitors:2026-01-03 user:101 user:105 user:106

# Merge into a weekly aggregate
PFMERGE visitors:week:2026-W01 \
  visitors:2026-01-01 \
  visitors:2026-01-02 \
  visitors:2026-01-03
# OK

# Query the weekly unique count
PFCOUNT visitors:week:2026-W01
# (integer) 6
```

## PFMERGE vs PFCOUNT with Multiple Keys

Both approaches compute the union cardinality, but they differ in behavior:

| Feature | PFCOUNT (multi-key) | PFMERGE |
|---------|--------------------|---------|
| Stores result | No | Yes |
| Modifies originals | No | No |
| Re-query cost | Recomputes each time | O(1) on destkey |
| Use case | Ad hoc queries | Persistent aggregates |

Use `PFMERGE` when you will query the same aggregate repeatedly or need to build hierarchical rollups.

## Building a Rollup Pipeline

```python
import redis
from datetime import date, timedelta

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def record_visit(user_id: str, visit_date: date):
    """Record a user visit for a specific date."""
    key = f"visitors:{visit_date.isoformat()}"
    r.pfadd(key, user_id)
    r.expire(key, 86400 * 90)  # Keep daily keys for 90 days

def build_weekly_rollup(week_start: date):
    """Merge 7 daily HLLs into a weekly aggregate."""
    daily_keys = [
        f"visitors:{(week_start + timedelta(days=i)).isoformat()}"
        for i in range(7)
    ]
    existing = [k for k in daily_keys if r.exists(k)]
    if not existing:
        return 0

    week_key = f"visitors:week:{week_start.isoformat()}"
    r.pfmerge(week_key, *existing)
    r.expire(week_key, 86400 * 365)  # Keep weekly rollups for 1 year
    return r.pfcount(week_key)

def build_monthly_rollup(year: int, month: int):
    """Merge weekly HLLs into a monthly aggregate."""
    # Collect week keys that fall within the month
    week_keys = [
        f"visitors:week:{year}-{month:02d}-{day:02d}"
        for day in range(1, 32, 7)
        if day <= 28
    ]
    existing = [k for k in week_keys if r.exists(k)]
    if not existing:
        return 0

    month_key = f"visitors:month:{year}-{month:02d}"
    r.pfmerge(month_key, *existing)
    return r.pfcount(month_key)

# Simulate visits
today = date(2026, 1, 15)
for user_num in range(1, 101):
    record_visit(f"user:{user_num}", today)

week_start = date(2026, 1, 13)
weekly_count = build_weekly_rollup(week_start)
print(f"Unique visitors this week: ~{weekly_count}")
```

## Merging Segmented HyperLogLogs

`PFMERGE` is also useful for combining per-region or per-feature HyperLogLogs into a global aggregate:

```bash
# Region-specific unique user counts
PFADD users:region:us-east user:101 user:102 user:103
PFADD users:region:us-west user:104 user:105 user:101
PFADD users:region:eu-west user:106 user:107

# Merge all regions into a global unique user count
PFMERGE users:global \
  users:region:us-east \
  users:region:us-west \
  users:region:eu-west

PFCOUNT users:global
# (integer) 7
```

## Merging Into an Existing HyperLogLog

`PFMERGE` can merge into a key that already has data. The destination is the union of itself and all source keys:

```bash
PFADD cumulative-visitors user:101 user:102
PFADD today-visitors user:103 user:104

# Append today's visitors into the cumulative total
PFMERGE cumulative-visitors cumulative-visitors today-visitors

PFCOUNT cumulative-visitors
```

## Summary

`PFMERGE` combines multiple Redis HyperLogLog structures into a persistent union, enabling hierarchical rollups (daily to weekly to monthly), segment aggregation (per-region to global), and any workflow where a merged unique-count needs to be stored for repeated querying. It complements `PFCOUNT` - use `PFCOUNT` for one-off multi-key union queries and `PFMERGE` when the aggregated result will be reused. Like all HyperLogLog operations, results carry a standard error of approximately 0.81%.
