# How to Build a Real-Time Revenue Tracker with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Revenue, Analytics, Real-Time, Dashboard

Description: Build a real-time revenue tracker with Redis that shows live GMV, revenue by product line, and daily totals with zero query latency.

---

Revenue dashboards that refresh every few seconds require a data layer that can handle concurrent writes and reads without blocking. Redis provides atomic float increments via HINCRBYFLOAT and instant reads for live revenue tracking.

## Recording Transactions

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def record_sale(amount: float, product_id: str, currency: str = "USD"):
    now = time.time()
    today = time.strftime("%Y-%m-%d")
    hour = int(now // 3600)

    pipe = r.pipeline()
    # Daily total
    pipe.hincrbyfloat(f"revenue:{today}", "total", amount)
    pipe.hincrbyfloat(f"revenue:{today}", f"product:{product_id}", amount)
    pipe.hincrbyfloat(f"revenue:{today}", "transactions", 1)
    # Hourly bucket
    pipe.hincrbyfloat(f"revenue:hourly:{hour}", "total", amount)
    pipe.expire(f"revenue:hourly:{hour}", 86400 * 7)
    # Running GMV all-time
    pipe.hincrbyfloat("revenue:all_time", "gmv", amount)
    pipe.execute()
```

## Live Dashboard Data

```python
def get_today_summary() -> dict:
    today = time.strftime("%Y-%m-%d")
    data = r.hgetall(f"revenue:{today}")
    return {
        "date": today,
        "total_revenue": float(data.get("total", 0)),
        "transaction_count": int(float(data.get("transactions", 0))),
        "avg_order_value": (
            float(data.get("total", 0)) /
            max(int(float(data.get("transactions", 1))), 1)
        ),
    }

def get_revenue_by_hour(hours: int = 24) -> list:
    now = int(time.time())
    current_hour = now // 3600
    result = []

    pipe = r.pipeline()
    for i in range(hours):
        pipe.hget(f"revenue:hourly:{current_hour - (hours - 1 - i)}", "total")
    totals = pipe.execute()

    for i, total in enumerate(totals):
        result.append({
            "hour_offset": i - (hours - 1),
            "revenue": float(total or 0),
        })
    return result
```

## Revenue Leaderboard by Product

```python
def get_top_products(n: int = 10) -> list:
    today = time.strftime("%Y-%m-%d")
    data = r.hgetall(f"revenue:{today}")

    products = [
        (k.replace("product:", ""), float(v))
        for k, v in data.items()
        if k.startswith("product:")
    ]
    return sorted(products, key=lambda x: x[1], reverse=True)[:n]
```

## Revenue Goal Progress

```python
def get_goal_progress(daily_goal: float) -> dict:
    today_data = get_today_summary()
    revenue = today_data["total_revenue"]
    return {
        "revenue": revenue,
        "goal": daily_goal,
        "progress_pct": round(revenue / daily_goal * 100, 1),
        "remaining": max(0, daily_goal - revenue),
    }
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor your payment processing endpoints - a downed payment service means revenue events stop flowing into Redis and your dashboard goes stale.

```bash
redis-cli HGETALL "revenue:$(date +%Y-%m-%d)"
```

## Summary

HINCRBYFLOAT enables atomic floating-point revenue accumulation across multiple dimensions (daily, hourly, per-product) in a single pipeline call. The daily Hash structure makes all revenue breakdowns available in one HGETALL call, which runs in O(N) where N is the number of fields in the hash. Combine with hourly buckets for time-series charts and an all-time GMV counter for executive dashboards.
