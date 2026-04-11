# How to Use Redis as an ML Feature Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Machine Learning, Feature Store, Real-Time, Data Pipeline

Description: Build a low-latency ML feature store with Redis to serve precomputed features for online inference, replacing slow database queries at prediction time.

---

A feature store holds precomputed ML features that models need at prediction time. Querying a relational database for features during inference adds hundreds of milliseconds of latency. Redis serves the same features in under 1ms, making real-time inference practical.

## Feature Storage Pattern

Store features as Redis Hashes keyed by entity ID:

```bash
# User features
HSET features:user:42 \
  age_bucket "25-34" \
  account_age_days "412" \
  total_orders "23" \
  avg_order_value "87.50" \
  days_since_last_order "3" \
  preferred_category "electronics"

EXPIRE features:user:42 86400  # features valid for 24 hours
```

## Writing Features from a Batch Pipeline

```python
import redis
import pandas as pd

r = redis.Redis(host="redis", port=6379, decode_responses=True)

def write_user_features(df: pd.DataFrame):
    """df must have columns: user_id, feature1, feature2, ..."""
    pipeline = r.pipeline()
    for _, row in df.iterrows():
        key = f"features:user:{row['user_id']}"
        features = {k: str(v) for k, v in row.items() if k != "user_id"}
        pipeline.hset(key, mapping=features)
        pipeline.expire(key, 86400)

    pipeline.execute()
    print(f"Wrote features for {len(df)} users")
```

## Reading Features at Inference Time

```python
import numpy as np

FEATURE_ORDER = [
    "account_age_days", "total_orders",
    "avg_order_value", "days_since_last_order"
]

def get_user_features(user_id: int) -> np.ndarray | None:
    key = f"features:user:{user_id}"
    data = r.hgetall(key)

    if not data:
        return None  # fall back to default features or skip

    return np.array([
        float(data.get(f, 0)) for f in FEATURE_ORDER
    ], dtype=np.float32)

# In your inference endpoint
def predict(user_id: int, item_id: int) -> float:
    features = get_user_features(user_id)
    if features is None:
        return default_score()

    return model.predict([features])[0]
```

## Batch Feature Retrieval

For ranking models that score many items at once:

```python
def get_features_batch(user_ids: list) -> dict:
    pipeline = r.pipeline()
    for uid in user_ids:
        pipeline.hgetall(f"features:user:{uid}")

    results = pipeline.execute()
    return {uid: data for uid, data in zip(user_ids, results) if data}
```

## Real-Time Feature Updates

For features that change frequently (last click, cart value), update them inline:

```python
import time

def update_cart_value(user_id: int, cart_value: float):
    r.hset(f"features:user:{user_id}", "cart_value", str(cart_value))
    r.hset(f"features:user:{user_id}", "last_activity_ts",
           str(int(time.time())))
```

## Feature Versioning

Add a version field to detect stale feature sets:

```python
FEATURE_VERSION = "v2"

def write_features(user_id: int, features: dict):
    key = f"features:user:{user_id}"
    r.hset(key, mapping={**features, "schema_version": FEATURE_VERSION})
    r.expire(key, 86400)

def get_features_safe(user_id: int):
    data = r.hgetall(f"features:user:{user_id}")
    if data.get("schema_version") != FEATURE_VERSION:
        return None  # treat as missing, use defaults
    return data
```

## Summary

Redis as a feature store gives ML models sub-millisecond access to precomputed entity features during inference. Batch pipelines write features as Redis Hashes with a TTL, and inference code retrieves them with `HGETALL`. Pipeline multiple reads for ranking workloads, update high-frequency features inline, and version feature schemas to detect stale data.
