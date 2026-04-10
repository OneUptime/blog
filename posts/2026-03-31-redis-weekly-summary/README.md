# How to Implement Weekly Summary with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Analytics, Time Series, Weekly, Aggregation

Description: Compute weekly summary statistics in Redis by rolling up daily counters into ISO week keys for trend analysis and reporting.

---

Weekly summaries power sprint reviews, business health dashboards, and SLA reports. Redis weekly keys aggregate seven daily buckets into a single value, making it fast to answer questions like "how does this week compare to last week?"

## ISO Week Key Convention

Use ISO year and week number for natural ordering and calendar alignment:

```python
import redis
import time
import datetime
import calendar

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def week_bucket(ts: float = None) -> str:
    ts = ts or time.time()
    dt = datetime.datetime.utcfromtimestamp(ts)
    iso = dt.isocalendar()
    return f"{iso[0]}W{iso[1]:02d}"  # e.g., 2026W13

def day_bucket(ts: float = None) -> str:
    ts = ts or time.time()
    return time.strftime("%Y%m%d", time.gmtime(ts))
```

## Rolling Up Days to Weeks

Aggregate the 7 daily buckets for a given week:

```python
def rollup_week(metric: str, any_day_in_week_ts: float) -> int:
    week = week_bucket(any_day_in_week_ts)
    week_key = f"weekly:{metric}:{week}"

    if r.exists(week_key):
        return int(r.get(week_key) or 0)

    # Find Monday of that week
    dt = datetime.datetime.utcfromtimestamp(any_day_in_week_ts)
    monday = dt - datetime.timedelta(days=dt.weekday())
    monday_ts = calendar.timegm(monday.replace(hour=0, minute=0, second=0).timetuple())

    pipe = r.pipeline()
    for d in range(7):
        ts = monday_ts + d * 86400
        pipe.get(f"daily:{metric}:{day_bucket(ts)}")

    results = pipe.execute()
    total = sum(int(v or 0) for v in results)

    r.set(week_key, total)
    r.expire(week_key, 2 * 365 * 86400)  # keep 2 years
    return total
```

## Week-over-Week Comparison

```python
def week_over_week(metric: str) -> dict:
    now = time.time()
    this_week_ts = now
    last_week_ts = now - 7 * 86400

    pipe = r.pipeline()
    pipe.get(f"weekly:{metric}:{week_bucket(this_week_ts)}")
    pipe.get(f"weekly:{metric}:{week_bucket(last_week_ts)}")
    this_val, last_val = pipe.execute()

    this_count = int(this_val or 0)
    last_count = int(last_val or 0)
    delta = this_count - last_count
    change_pct = (delta / max(last_count, 1)) * 100

    return {
        "this_week": week_bucket(this_week_ts),
        "last_week": week_bucket(last_week_ts),
        "this_count": this_count,
        "last_count": last_count,
        "delta": delta,
        "change_pct": round(change_pct, 1),
    }
```

## Weekly Stats Hash

Store richer statistics - sum, peak day, and average per day:

```python
def rollup_week_with_stats(metric: str, any_day_in_week_ts: float):
    week = week_bucket(any_day_in_week_ts)
    key = f"weekly_stats:{metric}:{week}"

    dt = datetime.datetime.utcfromtimestamp(any_day_in_week_ts)
    monday = dt - datetime.timedelta(days=dt.weekday())
    monday_ts = calendar.timegm(monday.replace(hour=0, minute=0, second=0).timetuple())

    daily_vals = []
    for d in range(7):
        ts = monday_ts + d * 86400
        v = r.get(f"daily:{metric}:{day_bucket(ts)}")
        daily_vals.append(int(v or 0))

    r.hset(key, mapping={
        "sum": sum(daily_vals),
        "avg": sum(daily_vals) / 7,
        "max": max(daily_vals),
        "min": min(daily_vals),
        "peak_day": daily_vals.index(max(daily_vals)),
    })
    r.expire(key, 2 * 365 * 86400)
```

## Fetching the Last N Weeks

```python
def get_last_n_weeks(metric: str, n: int = 12) -> list:
    now = time.time()
    pipe = r.pipeline()
    weeks = []
    for i in range(n):
        ts = now - i * 7 * 86400
        w = week_bucket(ts)
        pipe.get(f"weekly:{metric}:{w}")
        weeks.append(w)

    values = pipe.execute()
    return [
        {"week": w, "count": int(v or 0)}
        for w, v in zip(reversed(weeks), reversed(values))
    ]
```

## Summary

Redis weekly summaries use ISO week keys to aggregate seven daily counters into a compact, long-lived key. Week-over-week comparisons are a single pipeline call, and richer stats hashes enable per-week min, max, and peak-day analysis. With a 2-year TTL, weekly data stays available for retrospective reporting without manual archival.
