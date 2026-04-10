# How to Implement Monthly Archive with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Analytics, Archive, Monthly, Time Series

Description: Archive monthly metric totals in Redis by rolling up daily data into month keys with long TTLs for historical dashboards and reports.

---

Monthly archives power business reviews, SLA reports, and capacity planning. Redis monthly keys condense up to 31 daily buckets into a single entry with a multi-year TTL, giving you fast access to historical totals without hitting your primary database.

## Month Key Convention

```python
import redis
import time
import datetime

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def month_bucket(ts: float = None) -> str:
    ts = ts or time.time()
    return time.strftime("%Y%m", time.gmtime(ts))

def day_bucket(ts: float = None) -> str:
    ts = ts or time.time()
    return time.strftime("%Y%m%d", time.gmtime(ts))
```

## Rolling Up Days to Months

Aggregate all days in the target month:

```python
def rollup_month(metric: str, any_day_ts: float) -> int:
    month = month_bucket(any_day_ts)
    month_key = f"monthly:{metric}:{month}"

    if r.exists(month_key):
        return int(r.get(month_key) or 0)

    dt = datetime.datetime.fromtimestamp(any_day_ts, tz=datetime.timezone.utc)
    year, mon = dt.year, dt.month
    # Number of days in this month
    if mon == 12:
        next_month = datetime.datetime(year + 1, 1, 1)
    else:
        next_month = datetime.datetime(year, mon + 1, 1)
    days_in_month = (next_month - datetime.datetime(year, mon, 1)).days

    first_day_ts = datetime.datetime(year, mon, 1, tzinfo=datetime.timezone.utc).timestamp()
    pipe = r.pipeline()
    for d in range(days_in_month):
        ts = first_day_ts + d * 86400
        pipe.get(f"daily:{metric}:{day_bucket(ts)}")

    results = pipe.execute()
    total = sum(int(v or 0) for v in results)

    r.set(month_key, total)
    r.expire(month_key, 5 * 365 * 86400)  # keep 5 years
    return total
```

## Month-over-Month Comparison

```python
def month_over_month(metric: str) -> dict:
    now = time.time()
    dt = datetime.datetime.fromtimestamp(now, tz=datetime.timezone.utc)
    this_month = month_bucket(now)

    if dt.month == 1:
        last_dt = datetime.datetime(dt.year - 1, 12, 1, tzinfo=datetime.timezone.utc)
    else:
        last_dt = datetime.datetime(dt.year, dt.month - 1, 1, tzinfo=datetime.timezone.utc)
    last_month = month_bucket(last_dt.timestamp())

    pipe = r.pipeline()
    pipe.get(f"monthly:{metric}:{this_month}")
    pipe.get(f"monthly:{metric}:{last_month}")
    this_val, last_val = pipe.execute()

    this_count = int(this_val or 0)
    last_count = int(last_val or 0)
    change_pct = ((this_count - last_count) / max(last_count, 1)) * 100

    return {
        "this_month": this_month,
        "last_month": last_month,
        "this_count": this_count,
        "last_count": last_count,
        "change_pct": round(change_pct, 1),
    }
```

## Archiving Old Monthly Data to Hash

Consolidate multiple months into a single hash for years-old data to save key space:

```python
def archive_year(metric: str, year: int):
    archive_key = f"archive:{metric}:{year}"
    if r.exists(archive_key):
        return

    for month in range(1, 13):
        month_str = f"{year}{month:02d}"
        v = r.get(f"monthly:{metric}:{month_str}")
        if v:
            r.hset(archive_key, month_str, v)

    r.persist(archive_key)  # no expiry for archives
```

## Reading Monthly History

```python
def get_monthly_history(metric: str, months: int = 12) -> list:
    now = time.time()
    dt = datetime.datetime.fromtimestamp(now, tz=datetime.timezone.utc)

    pipe = r.pipeline()
    month_keys = []
    for i in range(months):
        m = dt.month - i
        y = dt.year
        while m <= 0:
            m += 12
            y -= 1
        key = f"monthly:{metric}:{y}{m:02d}"
        pipe.get(key)
        month_keys.append(f"{y}-{m:02d}")

    values = pipe.execute()
    return [
        {"month": mk, "count": int(v or 0)}
        for mk, v in zip(reversed(month_keys), reversed(values))
    ]
```

## Summary

Redis monthly archives provide fast access to multi-year historical totals using compact month-keyed strings. Rolling up daily data at month-end keeps keys current, while year-level hash consolidation reduces key count for older data. Month-over-month comparisons are a single pipeline call, making Redis an efficient layer for reporting dashboards.
