# How to Use Redis as a Feature Store for ML Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Machine Learning, Feature Store, MLOps, Real-Time

Description: Build a low-latency online feature store with Redis to serve pre-computed ML features during model inference, replacing slow database lookups with sub-millisecond retrieval.

---

A feature store decouples feature computation from model serving. In online inference, your model needs features (user history, product stats, session context) in milliseconds. Redis is the standard choice for an online feature store due to its sub-millisecond GET operations at scale.

## Feature Store Architecture

```text
Offline Compute (Spark / Flink)
        |
   Feature Values
        |
Redis Feature Store (online serving)
        |
   Model Serving Layer
        |
   Prediction Response
```

Offline pipelines compute features from historical data and write them to Redis. The model inference service reads features from Redis at prediction time.

## Feature Naming Convention

Use a consistent key schema:

```text
feature:{entity_type}:{entity_id}:{feature_name}
```

Or group all features for an entity in a Hash:

```text
features:{entity_type}:{entity_id}
```

## Writing Features to Redis

From an offline Spark job (via Python):

```python
import redis
from datetime import datetime, timezone

client = redis.Redis(host="redis.internal", port=6379, decode_responses=True)

def write_user_features(user_id: str, features: dict, ttl: int = 86400):
    key = f"features:user:{user_id}"
    client.hset(key, mapping={
        k: str(v) for k, v in features.items()
    })
    client.expire(key, ttl)

# Example: write computed features for user 42
write_user_features("42", {
    "avg_order_value_30d": 87.50,
    "order_count_30d": 5,
    "days_since_last_order": 3,
    "preferred_category": "electronics",
    "churn_risk_score": 0.12,
    "feature_timestamp": datetime.now(timezone.utc).isoformat()
})
```

## Bulk Feature Loading via Pipeline

```python
def bulk_write_features(feature_batch: list, ttl: int = 86400):
    pipe = client.pipeline(transaction=False)
    for record in feature_batch:
        key = f"features:{record['entity_type']}:{record['entity_id']}"
        pipe.hset(key, mapping={k: str(v) for k, v in record["features"].items()})
        pipe.expire(key, ttl)
    pipe.execute()
    print(f"Wrote {len(feature_batch)} feature records")
```

## Retrieving Features at Inference Time

```python
def get_user_features(user_id: str) -> dict:
    key = f"features:user:{user_id}"
    raw = client.hgetall(key)
    if not raw:
        return get_default_features()

    return {
        "avg_order_value_30d": float(raw.get("avg_order_value_30d", 0)),
        "order_count_30d": int(raw.get("order_count_30d", 0)),
        "days_since_last_order": int(raw.get("days_since_last_order", 999)),
        "preferred_category": raw.get("preferred_category", "unknown"),
        "churn_risk_score": float(raw.get("churn_risk_score", 0.5)),
    }

def get_default_features() -> dict:
    return {
        "avg_order_value_30d": 0.0,
        "order_count_30d": 0,
        "days_since_last_order": 999,
        "preferred_category": "unknown",
        "churn_risk_score": 0.5,
    }
```

## Batch Feature Retrieval for Scoring

```python
def get_features_batch(user_ids: list) -> list:
    pipe = client.pipeline(transaction=False)
    for uid in user_ids:
        pipe.hgetall(f"features:user:{uid}")
    results = pipe.execute()

    return [
        {
            "user_id": uid,
            "features": parse_user_features(raw) if raw else get_default_features()
        }
        for uid, raw in zip(user_ids, results)
    ]

def parse_user_features(raw: dict) -> dict:
    return {
        "avg_order_value_30d": float(raw.get("avg_order_value_30d", 0)),
        "order_count_30d": int(raw.get("order_count_30d", 0)),
        "days_since_last_order": int(raw.get("days_since_last_order", 999)),
        "preferred_category": raw.get("preferred_category", "unknown"),
        "churn_risk_score": float(raw.get("churn_risk_score", 0.5)),
    }
```

## Integration with scikit-learn Inference

```python
import joblib
import numpy as np

model = joblib.load("churn_model.pkl")

def predict_churn(user_id: str) -> float:
    features = get_user_features(user_id)
    X = np.array([[
        features["avg_order_value_30d"],
        features["order_count_30d"],
        features["days_since_last_order"],
        features["churn_risk_score"],
    ]])
    return float(model.predict_proba(X)[0][1])

print(predict_churn("42"))
```

## Monitoring Feature Freshness

```bash
# Check when a user's features were last computed
redis-cli HGET features:user:42 feature_timestamp

# Find keys expiring in the next hour
redis-cli --scan --pattern "features:user:*" | \
  xargs -I{} redis-cli TTL {} | \
  awk '$1 < 3600 && $1 > 0' | wc -l
```

## Summary

Redis makes an excellent online feature store for ML inference due to its sub-millisecond Hash lookups, simple TTL management, and support for bulk pipeline reads. By computing features offline and writing them to Redis with a reasonable TTL, your model serving layer retrieves fresh, pre-computed features with minimal latency - far faster than computing or querying them at inference time.
