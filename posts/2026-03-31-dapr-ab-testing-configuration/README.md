# How to Implement A/B Testing Configuration with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, A/B Testing, Configuration, Feature Flag, Experimentation

Description: Use the Dapr Configuration API to drive A/B experiments by assigning users to variants and reading variant-specific settings at runtime.

---

## A/B Testing with Configuration API

A/B testing requires variant assignment and per-variant configuration. Dapr's Configuration API stores both the assignment rules and variant-specific settings, and the subscription model ensures all pods see updates immediately.

## Storing Experiment Config

```bash
# Experiment definition
redis-cli SET "experiments||checkout-flow:enabled" "true"
redis-cli SET "experiments||checkout-flow:variants" '["control","variant-a","variant-b"]'
redis-cli SET "experiments||checkout-flow:weights" '[50,25,25]'

# Per-variant settings
redis-cli SET "experiments||checkout-flow:control:buttonText" "Buy Now"
redis-cli SET "experiments||checkout-flow:variant-a:buttonText" "Add to Cart"
redis-cli SET "experiments||checkout-flow:variant-b:buttonText" "Get It Now"
```

## Dapr Configuration Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: experiments
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
```

## Variant Assignment Logic

```python
import hashlib
import json
import requests

DAPR_PORT = 3500

def get_experiment_config(experiment: str) -> dict:
    keys = [
        f"{experiment}:enabled",
        f"{experiment}:variants",
        f"{experiment}:weights",
    ]
    resp = requests.get(
        f"http://localhost:{DAPR_PORT}/v1.0/configuration/experiments",
        params={"key": keys}
    )
    items = resp.json().get("items", {})
    return {k.split(":")[-1]: v["value"] for k, v in items.items()}


def assign_variant(user_id: str, experiment: str, weights: list, variants: list) -> str:
    # Deterministic assignment based on user_id hash
    hash_val = int(hashlib.md5(f"{user_id}:{experiment}".encode()).hexdigest(), 16)
    bucket = hash_val % 100
    cumulative = 0
    for variant, weight in zip(variants, weights):
        cumulative += weight
        if bucket < cumulative:
            return variant
    return variants[0]


def get_variant_config(experiment: str, variant: str, key: str) -> str:
    config_key = f"{experiment}:{variant}:{key}"
    resp = requests.get(
        f"http://localhost:{DAPR_PORT}/v1.0/configuration/experiments",
        params={"key": [config_key]}
    )
    items = resp.json().get("items", {})
    return items.get(config_key, {}).get("value", "")


def render_checkout(user_id: str) -> dict:
    cfg = get_experiment_config("checkout-flow")
    if cfg.get("enabled", "false") != "true":
        return {"buttonText": "Buy Now", "variant": "control"}

    variants = json.loads(cfg["variants"])
    weights = json.loads(cfg["weights"])
    variant = assign_variant(user_id, "checkout-flow", weights, variants)
    button_text = get_variant_config("checkout-flow", variant, "buttonText")

    return {"buttonText": button_text, "variant": variant}
```

## Recording Experiment Events

```python
from datetime import datetime, timezone

def record_conversion(user_id: str, experiment: str, variant: str, event: str):
    requests.post(
        f"http://localhost:{DAPR_PORT}/v1.0/publish/analytics-pubsub/experiment-events",
        json={
            "userId": user_id,
            "experiment": experiment,
            "variant": variant,
            "event": event,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )
```

## Changing Weights Without Redeployment

```bash
# Shift all traffic to variant-a after seeing positive results
redis-cli SET "experiments||checkout-flow:weights" '[0,100,0]'

# Disable experiment entirely
redis-cli SET "experiments||checkout-flow:enabled" "false"
```

Services subscribed to the `experiments` configuration store receive the update within seconds.

## Summary

Dapr's Configuration API provides a lightweight foundation for A/B testing without needing a dedicated experimentation platform. Variant assignments are deterministic per user, configuration values update live via subscriptions, and the pub/sub API records conversion events for analysis. The entire system runs on infrastructure you already have.
