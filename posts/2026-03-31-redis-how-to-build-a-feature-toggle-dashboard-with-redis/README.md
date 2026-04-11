# How to Build a Feature Toggle Dashboard with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Feature Flag, Feature Toggle, Dashboard, Backend

Description: Learn how to build a Redis-backed feature toggle system with per-user, percentage rollout, and environment-based flag evaluation.

---

## Why Redis for Feature Toggles

Feature flags need to be evaluated on every request with minimal latency. Redis provides sub-millisecond reads and instant updates, making it ideal for a feature flag store. Changes propagate in real time without application restarts.

## Flag Data Model

```text
flag:{name}         -> Hash: enabled, rollout_pct, environments, description
flag:{name}:overrides -> Hash: user ID -> "1" or "0" for per-user overrides
```

## Creating and Managing Flags

```python
from redis import Redis
import hashlib
import json
import time

r = Redis(decode_responses=True)

def create_flag(name: str, enabled: bool = False,
                rollout_pct: int = 0, description: str = ""):
    r.hset(f"flag:{name}", mapping={
        "name": name,
        "enabled": "1" if enabled else "0",
        "rollout_pct": rollout_pct,
        "description": description,
        "created_at": int(time.time()),
        "environments": json.dumps(["production", "staging"])
    })

def enable_flag(name: str):
    r.hset(f"flag:{name}", "enabled", "1")
    # Notify subscribers of the change
    r.publish("flags:updates", json.dumps({"flag": name, "enabled": True}))

def disable_flag(name: str):
    r.hset(f"flag:{name}", "enabled", "0")
    r.publish("flags:updates", json.dumps({"flag": name, "enabled": False}))

def set_rollout(name: str, pct: int):
    r.hset(f"flag:{name}", "rollout_pct", max(0, min(100, pct)))

def get_flag(name: str) -> dict | None:
    data = r.hgetall(f"flag:{name}")
    if not data:
        return None
    data["enabled"] = data["enabled"] == "1"
    data["rollout_pct"] = int(data.get("rollout_pct", 0))
    return data

def list_flags() -> list:
    keys = r.keys("flag:*")
    flags = []
    for key in keys:
        if ":" not in key.replace("flag:", ""):
            flag = r.hgetall(key)
            if flag:
                flag["enabled"] = flag.get("enabled") == "1"
                flags.append(flag)
    return flags
```

## Flag Evaluation

```python
def is_enabled(flag_name: str, user_id: str = None,
               environment: str = "production") -> bool:
    flag = get_flag(flag_name)
    if not flag:
        return False  # Unknown flag defaults to off

    if not flag["enabled"]:
        return False

    # Check environment restriction
    envs = json.loads(flag.get("environments", '["production"]'))
    if environment not in envs:
        return False

    # Check per-user override
    if user_id:
        override = r.hget(f"flag:{flag_name}:overrides", user_id)
        if override is not None:
            return override == "1"

    # Check rollout percentage
    rollout_pct = flag["rollout_pct"]
    if rollout_pct >= 100:
        return True
    if rollout_pct <= 0:
        return False

    if user_id:
        # Consistent hash-based rollout
        hash_val = int(hashlib.md5(f"{user_id}:{flag_name}".encode()).hexdigest(), 16)
        return (hash_val % 100) < rollout_pct

    return False

def set_user_override(flag_name: str, user_id: str, enabled: bool):
    r.hset(f"flag:{flag_name}:overrides", user_id, "1" if enabled else "0")

def remove_user_override(flag_name: str, user_id: str):
    r.hdel(f"flag:{flag_name}:overrides", user_id)
```

## Caching Flag Evaluations Locally

For ultra-high-throughput scenarios, cache flag states locally in the application with a short TTL:

```python
import threading
_flag_cache = {}
_cache_lock = threading.Lock()
FLAG_CACHE_TTL = 5  # seconds

def get_flag_cached(name: str) -> dict | None:
    now = time.time()
    with _cache_lock:
        if name in _flag_cache:
            cached_at, flag = _flag_cache[name]
            if now - cached_at < FLAG_CACHE_TTL:
                return flag
    flag = get_flag(name)
    with _cache_lock:
        _flag_cache[name] = (now, flag)
    return flag
```

## FastAPI Integration

```python
from fastapi import FastAPI, Cookie

app = FastAPI()

@app.on_event("startup")
def startup():
    create_flag("new_checkout_flow", enabled=True, rollout_pct=20,
                description="New checkout UX - gradual rollout")
    create_flag("dark_mode", enabled=True, rollout_pct=100)
    create_flag("ai_recommendations", enabled=False, rollout_pct=0)

@app.get("/checkout")
def checkout(user_id: str = Cookie(default="anonymous")):
    if is_enabled("new_checkout_flow", user_id):
        return {"flow": "new", "user": user_id}
    return {"flow": "legacy", "user": user_id}

@app.get("/admin/flags")
def admin_flags():
    return list_flags()

@app.post("/admin/flags/{name}/enable")
def enable(name: str):
    enable_flag(name)
    return {"status": "enabled", "flag": name}

@app.post("/admin/flags/{name}/rollout")
def set_rollout_pct(name: str, pct: int):
    set_rollout(name, pct)
    return {"flag": name, "rollout_pct": pct}
```

## Summary

A Redis-backed feature toggle system stores flag configuration in Hashes and evaluates flags using consistent hash-based rollout for deterministic per-user assignment. Per-user overrides in a separate Hash allow QA teams to test flags before broader rollout. Publishing flag changes to a Pub/Sub channel enables local cache invalidation across all application instances.
