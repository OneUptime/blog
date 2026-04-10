# How to Build a Real-Time A/B Test Results Dashboard with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, A/B Testing, Dashboard, Analytics, Experiment

Description: Build a real-time A/B test results dashboard with Redis that tracks conversions, impressions, and statistical significance live.

---

A/B tests need fast result collection and live dashboards so you can stop losing experiments quickly. Redis provides the atomic counters and low-latency reads to power a live results dashboard.

## Recording Impressions and Conversions

```python
import redis
import math

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def record_impression(experiment_id: str, variant: str):
    pipe = r.pipeline()
    pipe.incr(f"ab:{experiment_id}:{variant}:impressions")
    pipe.incr(f"ab:{experiment_id}:total:impressions")
    pipe.execute()

def record_conversion(experiment_id: str, variant: str):
    pipe = r.pipeline()
    pipe.incr(f"ab:{experiment_id}:{variant}:conversions")
    pipe.incr(f"ab:{experiment_id}:total:conversions")
    pipe.execute()
```

## Retrieving Live Results

```python
def get_variant_results(experiment_id: str, variant: str) -> dict:
    pipe = r.pipeline()
    pipe.get(f"ab:{experiment_id}:{variant}:impressions")
    pipe.get(f"ab:{experiment_id}:{variant}:conversions")
    impressions, conversions = pipe.execute()

    impressions = int(impressions or 0)
    conversions = int(conversions or 0)
    rate = conversions / impressions if impressions > 0 else 0

    return {
        "variant": variant,
        "impressions": impressions,
        "conversions": conversions,
        "conversion_rate": round(rate * 100, 2),
    }

def get_experiment_dashboard(experiment_id: str, variants: list) -> list:
    return [get_variant_results(experiment_id, v) for v in variants]
```

## Statistical Significance Check

```python
def z_score(p1: float, n1: int, p2: float, n2: int) -> float:
    if n1 == 0 or n2 == 0:
        return 0.0
    pooled_p = (p1 * n1 + p2 * n2) / (n1 + n2)
    se = math.sqrt(pooled_p * (1 - pooled_p) * (1/n1 + 1/n2))
    if se == 0:
        return 0.0
    return abs(p1 - p2) / se

def is_significant(experiment_id: str, control: str, treatment: str) -> dict:
    ctrl = get_variant_results(experiment_id, control)
    trt = get_variant_results(experiment_id, treatment)

    z = z_score(
        ctrl["conversion_rate"] / 100, ctrl["impressions"],
        trt["conversion_rate"] / 100, trt["impressions"]
    )
    # z > 1.96 corresponds to 95% confidence
    return {"z_score": round(z, 3), "significant": z > 1.96}
```

## Variant Assignment with Consistency

```python
import hashlib

def assign_variant(experiment_id: str, user_id: str, variants: list) -> str:
    hash_val = int(hashlib.md5(f"{experiment_id}:{user_id}".encode()).hexdigest(), 16)
    return variants[hash_val % len(variants)]
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor your experiment service uptime - a downed A/B test service means you are unknowingly running one variant for all users.

## Summary

Redis counters give you sub-millisecond impression and conversion tracking that scales to millions of events per second. PIPELINE calls batch reads per variant, keeping the dashboard API fast. Deterministic hash-based variant assignment guarantees consistent user experiences.
