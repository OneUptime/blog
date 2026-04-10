# How to Implement Risk Scoring Engine with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Finance, Risk, Lua, Cache

Description: Build a real-time risk scoring engine with Redis that aggregates behavioral signals, applies weighted rules, and returns a composite risk score in under a millisecond.

---

Risk scoring needs to be fast - it runs on every transaction or login attempt. Querying a database for behavioral signals under load introduces unacceptable latency. Redis holds all the signals in memory and a Lua script computes composite scores atomically in a single round-trip.

## Signal Storage

Store each risk signal as a separate key with an appropriate TTL:

```python
import redis
import time

r = redis.Redis()

def record_signal(user_id, signal_name, value, ttl=3600):
    r.setex(f"risk:{user_id}:{signal_name}", ttl, value)
```

Common signals include:
- `failed_logins_1h` - failed login count in the past hour
- `new_device` - first seen device flag
- `geo_change` - country change since last session
- `velocity_high` - high transaction velocity flag

## Populating Signals

Update signals on relevant events:

```python
def record_failed_login(user_id):
    key = f"risk:{user_id}:failed_logins_1h"
    r.incr(key)
    r.expire(key, 3600)

def flag_new_device(user_id, ttl=86400):
    r.setex(f"risk:{user_id}:new_device", ttl, 1)

def flag_geo_change(user_id, ttl=3600):
    r.setex(f"risk:{user_id}:geo_change", ttl, 1)
```

## Scoring Rule Definition

Store scoring weights in Redis so they can be tuned without redeployment:

```bash
HSET risk:weights failed_logins_1h 20 new_device 15 geo_change 25 velocity_high 30
```

## Composite Score Calculation with Lua

Compute the score in a single server-side script:

```lua
local user_id = ARGV[1]
local weights_key = KEYS[1]
local score = 0

local signals = {
  "failed_logins_1h", "new_device", "geo_change", "velocity_high"
}
for _, signal in ipairs(signals) do
  local value = tonumber(redis.call("GET", "risk:" .. user_id .. ":" .. signal) or "0")
  local weight = tonumber(redis.call("HGET", weights_key, signal) or "0")
  if value > 0 then
    score = score + weight
  end
end
return score
```

```python
score_script = r.register_script(open("risk_score.lua").read())

def compute_risk_score(user_id):
    return int(score_script(keys=["risk:weights"], args=[user_id]))
```

## Risk Decision

Apply thresholds to the score:

```python
def risk_decision(user_id):
    score = compute_risk_score(user_id)
    if score >= 60:
        return "block"
    elif score >= 30:
        return "challenge"  # Trigger MFA
    else:
        return "allow"
```

## Score Caching

Cache the computed score for repeated checks within the same session:

```python
def get_risk_score_cached(user_id):
    cache_key = f"risk:score:{user_id}"
    cached = r.get(cache_key)
    if cached:
        return int(cached)
    score = compute_risk_score(user_id)
    r.setex(cache_key, 300, score)  # Cache for 5 minutes
    return score
```

## Audit Trail

Log every risk decision for compliance:

```python
def log_risk_decision(user_id, score, decision, context):
    entry = f"{time.time()}:{score}:{decision}:{context}"
    r.lpush(f"risk:audit:{user_id}", entry)
    r.ltrim(f"risk:audit:{user_id}", 0, 99)
```

## Summary

Redis enables a sub-millisecond risk scoring engine by keeping all behavioral signals in memory and using Lua scripts to aggregate weighted scores in a single server-side execution. Hot-swappable weights and a 5-minute score cache make the engine both adaptable to evolving threat patterns and efficient under high transaction volumes.
