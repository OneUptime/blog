# How to Implement Tiered Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, API

Description: Build tiered Redis rate limiting that enforces different request quotas for free, pro, and enterprise users based on their subscription plan.

---

Most production APIs need different rate limits for different customer segments. Free tier users get basic quotas, paid users get higher limits, and enterprise customers may get virtually unlimited access. Redis makes tiered rate limiting straightforward by looking up a user's tier and applying the corresponding limit configuration.

## Tier Configuration

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

TIER_LIMITS = {
    "free":       {"rpm": 60,    "rph": 1000,   "rpd": 5000},
    "starter":    {"rpm": 300,   "rph": 5000,   "rpd": 50000},
    "pro":        {"rpm": 1000,  "rph": 20000,  "rpd": 200000},
    "enterprise": {"rpm": 10000, "rph": 200000, "rpd": 2000000},
}
```

## Storing and Fetching User Tier

```python
def set_user_tier(user_id: str, tier: str):
    r.hset(f"user:{user_id}", "tier", tier)

def get_user_tier(user_id: str) -> str:
    tier = r.hget(f"user:{user_id}", "tier")
    return tier if tier in TIER_LIMITS else "free"
```

## Multi-Window Tiered Rate Check

Enforce per-minute, per-hour, and per-day limits simultaneously:

```python
def check_tiered_rate_limit(user_id: str) -> dict:
    tier = get_user_tier(user_id)
    limits = TIER_LIMITS[tier]
    now = time.time()

    minute_window = int(now // 60)
    hour_window = int(now // 3600)
    day_window = int(now // 86400)

    keys = {
        "minute": (f"rl:{user_id}:m:{minute_window}", limits["rpm"], 60),
        "hour":   (f"rl:{user_id}:h:{hour_window}", limits["rph"], 3600),
        "day":    (f"rl:{user_id}:d:{day_window}", limits["rpd"], 86400),
    }

    pipe = r.pipeline()
    for _, (key, _, ttl) in keys.items():
        pipe.incr(key)
        pipe.expire(key, ttl + 5)
    results = pipe.execute()

    counts = {
        "minute": results[0],
        "hour":   results[2],
        "day":    results[4],
    }

    for window_name, (key, limit, _) in keys.items():
        if counts[window_name] > limit:
            return {
                "allowed": False,
                "tier": tier,
                "exceeded_window": window_name,
                "limit": limit,
                "count": counts[window_name],
            }

    return {
        "allowed": True,
        "tier": tier,
        "counts": counts,
        "limits": limits,
    }
```

## Flask Endpoint with Tiered Limiting

```python
from flask import Flask, request, jsonify, g
import jwt

app = Flask(__name__)
JWT_SECRET = "your-secret"

@app.before_request
def tiered_rate_limit():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return  # Unauthenticated - handled by IP limiting separately

    token = auth[7:]
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    user_id = payload.get("user_id")
    if not user_id:
        return

    result = check_tiered_rate_limit(user_id)
    g.rate_limit = result

    if not result["allowed"]:
        return jsonify({
            "error": "Rate limit exceeded",
            "tier": result["tier"],
            "exceeded_window": result["exceeded_window"],
            "limit": result["limit"],
        }), 429
```

## Upgrading a User's Tier Instantly

Because tier lookups hit Redis, upgrades take effect immediately:

```python
def upgrade_user_tier(user_id: str, new_tier: str):
    set_user_tier(user_id, new_tier)
    # No cache invalidation needed - tier is read fresh per request
```

## Checking a User's Current Usage

```bash
# Per-minute usage for a user
redis-cli GET "rl:user_123:m:$(date +%s | awk '{print int($1/60)}')"

# Per-day usage
redis-cli GET "rl:user_123:d:$(date +%s | awk '{print int($1/86400)}')"
```

## Summary

Tiered rate limiting adds a tier lookup before every rate limit check, selecting the appropriate quota for each user. Enforcing multiple time windows (per-minute AND per-day) prevents both short bursts and sustained over-usage. Because tier data lives in Redis, plan upgrades and downgrades take effect immediately without requiring application restarts or cache flushes.
