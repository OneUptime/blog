# How to Build a Portfolio Value Tracker with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Finance, Portfolio, Hash, Sorted Set

Description: Track investment portfolio values in real time with Redis by caching positions, computing mark-to-market values from live price feeds, and maintaining portfolio rankings.

---

Portfolio value tracking requires blending static position data (shares owned) with live market prices. Querying a relational database on every price tick is too slow. Redis holds both positions and prices in memory, enabling sub-millisecond mark-to-market calculations across thousands of portfolios.

## Storing Positions

A portfolio's holdings live in a hash:

```bash
HSET portfolio:user-1001 AAPL 50 MSFT 30 GOOGL 10 TSLA 20
```

Each field is the ticker symbol and the value is the number of shares held.

## Caching Live Prices

Store current prices in a separate hash, refreshed on every tick:

```python
import redis
r = redis.Redis(decode_responses=True)

def update_price(ticker, price):
    r.hset("prices:current", ticker, price)
```

## Mark-to-Market Calculation

Compute portfolio value using a Lua script for atomicity:

```lua
local portfolio_key = KEYS[1]
local prices_key = KEYS[2]
local positions = redis.call("HGETALL", portfolio_key)
local total = 0
for i = 1, #positions, 2 do
  local ticker = positions[i]
  local shares = tonumber(positions[i+1])
  local price = tonumber(redis.call("HGET", prices_key, ticker) or "0")
  total = total + (shares * price)
end
return tostring(total)
```

```python
def portfolio_value(user_id):
    script = r.register_script(open("portfolio_value.lua").read())
    value = script(keys=[f"portfolio:{user_id}", "prices:current"])
    return float(value)
```

## Portfolio Value Leaderboard

Rank portfolios by value using a sorted set:

```python
def update_portfolio_ranking(user_id):
    value = portfolio_value(user_id)
    r.zadd("portfolios:ranking", {user_id: value})

def top_portfolios(n=10):
    return r.zrevrange("portfolios:ranking", 0, n - 1, withscores=True)
```

## Value History

Store portfolio snapshots at regular intervals:

```python
import time

def snapshot_portfolio(user_id):
    value = portfolio_value(user_id)
    ts = int(time.time())
    r.zadd(f"portfolio:{user_id}:history", {f"{ts}:{value}": ts})
    r.zremrangebyrank(f"portfolio:{user_id}:history", 0, -1441)  # 24h at 1/min
```

## Gain/Loss Calculation

Compute daily gain by comparing to the snapshot from 24 hours ago:

```python
def daily_gain(user_id):
    current = portfolio_value(user_id)
    history = r.zrangebyscore(
        f"portfolio:{user_id}:history",
        time.time() - 86400, time.time() - 82800,
        withscores=False
    )
    if not history:
        return None
    past_value = float(history[0].split(":")[1])
    return current - past_value
```

## Alerts on Large Changes

Detect significant moves and notify the user:

```python
CHANGE_ALERT_PCT = 5.0

def check_value_alert(user_id):
    gain = daily_gain(user_id)
    current = portfolio_value(user_id)
    if current == 0:
        return
    change_pct = abs(gain / current * 100) if gain else 0
    if change_pct >= CHANGE_ALERT_PCT:
        r.publish(f"alerts:portfolio:{user_id}", f"Value changed {change_pct:.1f}%")
```

## Summary

Redis enables real-time portfolio tracking by combining position hashes with a live price hash and using Lua scripts for atomic mark-to-market calculations. Sorted sets deliver instant portfolio rankings, while timestamped history and Pub/Sub alerts give users a complete picture of their portfolio performance without touching a relational database.
