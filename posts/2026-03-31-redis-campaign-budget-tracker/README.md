# How to Build a Campaign Budget Tracker with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Campaign, Budget

Description: Use Redis atomic operations and Lua scripts to build a real-time campaign budget tracker that prevents overspending across distributed systems.

---

Ad campaigns have strict budgets. Overspending by even a few percent can cost thousands of dollars. You need a budget tracker that is both fast and accurate - Redis atomic operations make this possible without a database bottleneck.

## Setting Up a Campaign Budget

Store the budget and spent amount in a Redis hash. Initialize it when a campaign is created:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_campaign(campaign_id: str, daily_budget_cents: int):
    r.hset(f"campaign:{campaign_id}", mapping={
        "daily_budget": daily_budget_cents,
        "spent_today": 0,
        "status": "active"
    })
    # Auto-reset at midnight using a separate expiring key
    r.set(f"campaign:{campaign_id}:reset", 1, ex=seconds_until_midnight())

def seconds_until_midnight() -> int:
    import datetime
    now = datetime.datetime.now()
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0) + datetime.timedelta(days=1)
    return int((midnight - now).total_seconds())
```

## Atomic Budget Deduction with Lua

The critical operation is deducting a bid amount only if the budget has not been exceeded. A Lua script guarantees this is atomic:

```lua
-- budget_check.lua
local key = KEYS[1]
local cost = tonumber(ARGV[1])
local budget = tonumber(redis.call('HGET', key, 'daily_budget'))
local spent = tonumber(redis.call('HGET', key, 'spent_today'))

if spent + cost > budget then
    return 0  -- over budget
end

redis.call('HINCRBYFLOAT', key, 'spent_today', cost)
return 1  -- approved
```

```python
budget_check_script = r.register_script(open('budget_check.lua').read())

def try_spend(campaign_id: str, cost_cents: int) -> bool:
    result = budget_check_script(
        keys=[f"campaign:{campaign_id}"],
        args=[cost_cents]
    )
    return bool(result)
```

## Checking Budget Status

```python
def get_budget_status(campaign_id: str) -> dict:
    data = r.hgetall(f"campaign:{campaign_id}")
    if not data:
        return {}

    budget = int(data.get("daily_budget", 0))
    spent = float(data.get("spent_today", 0))
    remaining = budget - spent
    pct_used = (spent / budget * 100) if budget > 0 else 0

    return {
        "campaign_id": campaign_id,
        "daily_budget_cents": budget,
        "spent_today_cents": int(spent),
        "remaining_cents": int(remaining),
        "percent_used": round(pct_used, 2),
        "status": "paused" if remaining <= 0 else "active"
    }
```

## Pacing the Budget

To avoid spending the whole budget in the first hour, implement budget pacing. Divide the daily budget into hourly caps:

```python
def get_hourly_cap(campaign_id: str) -> int:
    budget = int(r.hget(f"campaign:{campaign_id}", "daily_budget") or 0)
    import datetime
    hours_remaining = 24 - datetime.datetime.now().hour
    return budget // max(hours_remaining, 1)

def within_hourly_pace(campaign_id: str, cost_cents: int) -> bool:
    import time
    hour_key = f"campaign:{campaign_id}:hour:{int(time.time() // 3600)}"
    spent_this_hour = int(r.get(hour_key) or 0)
    cap = get_hourly_cap(campaign_id)
    if spent_this_hour + cost_cents > cap:
        return False
    r.incrby(hour_key, cost_cents)
    r.expire(hour_key, 7200)
    return True
```

## Daily Reset

When the reset key expires, reset the campaign budget for a new day:

```python
def reset_daily_budget(campaign_id: str):
    pipe = r.pipeline()
    pipe.hset(f"campaign:{campaign_id}", "spent_today", 0)
    pipe.hset(f"campaign:{campaign_id}", "status", "active")
    pipe.set(f"campaign:{campaign_id}:reset", 1, ex=seconds_until_midnight())
    pipe.execute()
```

## Summary

Redis Lua scripts enable atomic budget checks that prevent overspending even under heavy concurrent load. Combining daily budgets with hourly pacing keys gives you both hard limits and smooth budget distribution, making Redis an excellent choice for real-time ad spend management.
