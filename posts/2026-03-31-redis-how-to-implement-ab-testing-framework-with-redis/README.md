# How to Implement A/B Testing Framework with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, A/B Testing, Feature Flag, Experimentation, Backend

Description: Learn how to build a Redis-backed A/B testing framework that assigns users to experiment variants and tracks conversion metrics in real time.

---

## A/B Testing Architecture with Redis

An A/B testing framework needs three capabilities:
1. Consistent variant assignment (same user always gets same variant)
2. Conversion tracking per variant
3. Real-time result computation (conversion rates per variant)

Redis Hashes store experiment config and variant assignments, and simple counters track impressions and conversions.

## Experiment Configuration

```python
from redis import Redis
import hashlib
import json
import time

r = Redis(decode_responses=True)

def create_experiment(exp_id: str, variants: list[dict], description: str = ""):
    """
    variants: [{"name": "control", "weight": 50}, {"name": "variant_a", "weight": 50}]
    """
    r.hset(f"exp:{exp_id}", mapping={
        "id": exp_id,
        "description": description,
        "variants": json.dumps(variants),
        "created_at": int(time.time()),
        "status": "active"
    })
    return exp_id

def get_experiment(exp_id: str) -> dict | None:
    data = r.hgetall(f"exp:{exp_id}")
    if not data:
        return None
    data["variants"] = json.loads(data["variants"])
    return data
```

## Consistent Variant Assignment

Use a hash of (user_id + experiment_id) to deterministically assign variants:

```python
def assign_variant(user_id: str, exp_id: str) -> str | None:
    # Check if already assigned
    assignment_key = f"exp:{exp_id}:assignments"
    existing = r.hget(assignment_key, user_id)
    if existing:
        return existing

    exp = get_experiment(exp_id)
    if not exp or exp.get("status") != "active":
        return None

    variants = exp["variants"]

    # Deterministic hash-based assignment
    hash_val = int(hashlib.md5(f"{user_id}:{exp_id}".encode()).hexdigest(), 16)
    bucket = hash_val % 100

    # Assign based on cumulative weights
    cumulative = 0
    assigned_variant = variants[-1]["name"]
    for variant in variants:
        cumulative += variant["weight"]
        if bucket < cumulative:
            assigned_variant = variant["name"]
            break

    # Store assignment
    r.hset(assignment_key, user_id, assigned_variant)
    return assigned_variant
```

## Tracking Impressions and Conversions

```python
def track_impression(exp_id: str, variant: str):
    r.incr(f"exp:{exp_id}:impressions:{variant}")

def track_conversion(exp_id: str, variant: str, goal: str = "primary"):
    r.incr(f"exp:{exp_id}:conversions:{variant}:{goal}")

def get_experiment_results(exp_id: str) -> dict:
    exp = get_experiment(exp_id)
    if not exp:
        return {}

    results = {"experiment": exp_id, "variants": {}}
    for variant_info in exp["variants"]:
        variant = variant_info["name"]
        impressions = int(r.get(f"exp:{exp_id}:impressions:{variant}") or 0)
        conversions = int(r.get(f"exp:{exp_id}:conversions:{variant}:primary") or 0)
        rate = round(conversions / impressions * 100, 2) if impressions > 0 else 0
        results["variants"][variant] = {
            "impressions": impressions,
            "conversions": conversions,
            "conversion_rate_pct": rate
        }

    return results
```

## Full Flow - Assign and Track

```python
def get_variant_for_user(user_id: str, exp_id: str) -> str | None:
    variant = assign_variant(user_id, exp_id)
    if variant:
        track_impression(exp_id, variant)
    return variant

def record_user_conversion(user_id: str, exp_id: str, goal: str = "primary"):
    assignment_key = f"exp:{exp_id}:assignments"
    variant = r.hget(assignment_key, user_id)
    if variant:
        track_conversion(exp_id, variant, goal)
```

## FastAPI Integration

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI, Cookie

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_experiment("homepage_cta", [
        {"name": "control", "weight": 50},
        {"name": "new_cta", "weight": 50}
    ], "Test new call-to-action button text")
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/homepage")
def homepage(user_id: str = Cookie(default="anonymous")):
    variant = get_variant_for_user(user_id, "homepage_cta")
    cta_text = "Get Started" if variant == "control" else "Start Free Trial"
    return {"cta_text": cta_text, "variant": variant}

@app.post("/signup")
def signup(user_id: str = Cookie(default="anonymous")):
    record_user_conversion(user_id, "homepage_cta")
    return {"status": "signed up"}

@app.get("/experiments/{exp_id}/results")
def results(exp_id: str):
    return get_experiment_results(exp_id)
```

## Summary

A Redis A/B testing framework uses hash-based deterministic variant assignment for consistency, per-variant counters for real-time conversion tracking, and Hash storage for experiment configuration. Storing assignments in a Redis Hash enables looking up a user's variant at conversion time. Conversion rate calculation from live counters gives instant experiment results.
