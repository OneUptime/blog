# How to Use Dapr Configuration for A/B Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, A/B Testing, Configuration API, Experimentation, Microservice

Description: Learn how to implement A/B testing using the Dapr Configuration API to run controlled experiments and gradually roll out new features by user segment.

---

A/B testing lets you compare two variants of a feature to measure which performs better. Dapr's Configuration API provides the runtime configuration needed to control experiment assignment and variant parameters, with real-time subscription support for quick experiment adjustments.

## A/B Test Configuration Schema

Design a consistent schema for your A/B test parameters:

```bash
# Experiment: new homepage layout
redis-cli SET myapp||exp.homepage-layout.enabled "true||1"
redis-cli SET myapp||exp.homepage-layout.variant-a-pct "50||1"
redis-cli SET myapp||exp.homepage-layout.variant-b-pct "50||1"

# Experiment: checkout button color
redis-cli SET myapp||exp.checkout-cta.enabled "true||1"
redis-cli SET myapp||exp.checkout-cta.variant-a-pct "70||1"
redis-cli SET myapp||exp.checkout-cta.variant-b-pct "30||1"
redis-cli SET myapp||exp.checkout-cta.variant-a-value "green||1"
redis-cli SET myapp||exp.checkout-cta.variant-b-value "orange||1"
```

## Experiment Assignment Logic

Assign users to variants consistently using hashing:

```python
import hashlib
import httpx
from dataclasses import dataclass
from typing import Optional

@dataclass
class ExperimentConfig:
    enabled: bool
    variant_a_pct: int
    variant_b_pct: int
    variant_a_value: Optional[str] = None
    variant_b_value: Optional[str] = None

async def get_experiment_config(exp_name: str) -> ExperimentConfig:
    keys = [
        f"exp.{exp_name}.enabled",
        f"exp.{exp_name}.variant-a-pct",
        f"exp.{exp_name}.variant-b-pct",
        f"exp.{exp_name}.variant-a-value",
        f"exp.{exp_name}.variant-b-value",
    ]

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "http://localhost:3500/v1.0/configuration/appconfig",
            params={"key": keys}
        )
        items = resp.json()

    return ExperimentConfig(
        enabled=items.get(f"exp.{exp_name}.enabled", {}).get("value", "false") == "true",
        variant_a_pct=int(items.get(f"exp.{exp_name}.variant-a-pct", {}).get("value", "50")),
        variant_b_pct=int(items.get(f"exp.{exp_name}.variant-b-pct", {}).get("value", "50")),
        variant_a_value=items.get(f"exp.{exp_name}.variant-a-value", {}).get("value"),
        variant_b_value=items.get(f"exp.{exp_name}.variant-b-value", {}).get("value"),
    )

def assign_variant(exp_name: str, user_id: str, config: ExperimentConfig) -> str:
    if not config.enabled:
        return "control"

    hash_val = int(hashlib.sha256(f"{exp_name}:{user_id}".encode()).hexdigest(), 16)
    bucket = hash_val % 100

    if bucket < config.variant_a_pct:
        return "a"
    elif bucket < config.variant_a_pct + config.variant_b_pct:
        return "b"
    return "control"
```

## Applying A/B Tests in a Route Handler

```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.get("/")
async def homepage(request: Request):
    user_id = request.headers.get("X-User-ID", "anonymous")
    config = await get_experiment_config("homepage-layout")
    variant = assign_variant("homepage-layout", user_id, config)

    # Track assignment for analysis
    track_experiment_assignment("homepage-layout", variant, user_id)

    if variant == "b":
        return {"layout": "new", "variant": "b"}

    return {"layout": "original", "variant": "a"}
```

## Tracking Results

Track conversions alongside variant assignments:

```python
from prometheus_client import Counter

experiment_assignments = Counter(
    'ab_test_assignment_total',
    'A/B test user assignments',
    ['experiment', 'variant']
)

experiment_conversions = Counter(
    'ab_test_conversion_total',
    'A/B test conversion events',
    ['experiment', 'variant', 'event']
)

def track_experiment_assignment(exp: str, variant: str, user_id: str):
    experiment_assignments.labels(experiment=exp, variant=variant).inc()

def track_conversion(exp: str, variant: str, event: str):
    experiment_conversions.labels(experiment=exp, variant=variant, event=event).inc()
```

## Stopping an Experiment

Update configuration to end the experiment and roll out the winning variant:

```bash
# Stop the experiment and serve variant B to everyone
redis-cli SET myapp||exp.checkout-cta.enabled "true||2"
redis-cli SET myapp||exp.checkout-cta.variant-a-pct "0||2"
redis-cli SET myapp||exp.checkout-cta.variant-b-pct "100||2"
```

## Summary

Using the Dapr Configuration API for A/B testing gives you a lightweight experiment platform backed by Redis with real-time control. Define experiment parameters as configuration keys, use consistent hashing for stable variant assignment, track assignments and conversions with metrics, and control experiments by updating configuration keys - all without redeploying your services.
