# How to Build an A/B Test Framework for ML Models with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Machine Learning, A/B Testing, Experiment, Inference

Description: Implement a Redis-backed A/B test framework to split inference traffic between ML model versions, track per-variant metrics, and promote winners atomically.

---

Deploying a new ML model is risky without traffic splitting. An A/B test framework routes a percentage of requests to the challenger model while the champion handles the rest. Redis stores experiment configuration and accumulates per-variant metrics in real time.

## Experiment Configuration

Store experiment parameters as a Redis Hash:

```python
import redis

r = redis.Redis(host="redis", port=6379, decode_responses=True)

def create_experiment(
    experiment_id: str,
    model_a: str,
    model_b: str,
    traffic_split: float = 0.1  # 10% to model B
):
    r.hset(f"experiment:{experiment_id}", mapping={
        "model_a": model_a,
        "model_b": model_b,
        "traffic_b": str(traffic_split),
        "status": "running",
        "created_at": str(int(__import__("time").time()))
    })
    r.sadd("active_experiments", experiment_id)

create_experiment(
    "exp-fraud-v3",
    model_a="fraud_detector:v2.3.1",
    model_b="fraud_detector:v3.0.0",
    traffic_split=0.1
)
```

## Assigning Users to Variants

Consistent assignment ensures the same user always gets the same model:

```python
import hashlib

def assign_variant(experiment_id: str, entity_id: str) -> str:
    config = r.hgetall(f"experiment:{experiment_id}")
    if config.get("status") != "running":
        return config["model_a"]  # default to champion

    # Hash-based deterministic assignment
    hash_input = f"{experiment_id}:{entity_id}"
    hash_val = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
    bucket = (hash_val % 100) / 100  # 0.00 to 0.99

    split = float(config["traffic_b"])
    return config["model_b"] if bucket < split else config["model_a"]
```

## Running Inference with Variant Tracking

```python
import time

def predict_with_experiment(
    experiment_id: str, entity_id: str,
    inputs: dict, models: dict
) -> dict:
    model_key = assign_variant(experiment_id, entity_id)
    model = models[model_key]

    start = time.time()
    prediction = model.predict(inputs)
    latency_ms = (time.time() - start) * 1000

    # Track per-variant metrics
    variant = "b" if model_key == r.hget(f"experiment:{experiment_id}", "model_b") else "a"
    track_prediction(experiment_id, variant, latency_ms)

    return {"prediction": prediction, "variant": variant, "model": model_key}

def track_prediction(experiment_id: str, variant: str, latency_ms: float):
    pipeline = r.pipeline()
    pipeline.incr(f"exp_metrics:{experiment_id}:{variant}:count")
    pipeline.incrbyfloat(f"exp_metrics:{experiment_id}:{variant}:latency_sum", latency_ms)
    pipeline.execute()
```

## Recording Outcomes

Link predictions to business outcomes (conversions, fraud confirmed, etc.):

```python
def record_outcome(
    experiment_id: str, variant: str,
    positive: bool
):
    key = f"exp_metrics:{experiment_id}:{variant}"
    if positive:
        r.incr(f"{key}:positives")
    else:
        r.incr(f"{key}:negatives")
```

## Reading Experiment Results

```python
def get_experiment_results(experiment_id: str) -> dict:
    results = {}
    for variant in ("a", "b"):
        key = f"exp_metrics:{experiment_id}:{variant}"
        count = int(r.get(f"{key}:count") or 0)
        positives = int(r.get(f"{key}:positives") or 0)
        latency_sum = float(r.get(f"{key}:latency_sum") or 0)

        results[variant] = {
            "requests": count,
            "positives": positives,
            "conversion_rate": round(positives / count, 4) if count else 0,
            "avg_latency_ms": round(latency_sum / count, 2) if count else 0
        }

    return results
```

## Promoting the Winner

```python
def conclude_experiment(experiment_id: str, winner: str):
    config = r.hgetall(f"experiment:{experiment_id}")
    winning_model = config[f"model_{winner}"]

    # Update production pointer
    model_name = winning_model.split(":")[0]
    r.set(f"model:production:{model_name}", winning_model.split(":")[1])

    # Close experiment
    r.hset(f"experiment:{experiment_id}", "status", "concluded")
    r.hset(f"experiment:{experiment_id}", "winner", winning_model)
    r.srem("active_experiments", experiment_id)
```

## Summary

A Redis-backed A/B test framework assigns users to model variants via hash-based bucketing for consistency, tracks per-variant request counts and latencies with atomic increments, and records business outcomes as they arrive. The winning model can be atomically promoted by updating the production pointer key. All experiment state lives in Redis, so any inference service can read the current assignment without coordination overhead.
