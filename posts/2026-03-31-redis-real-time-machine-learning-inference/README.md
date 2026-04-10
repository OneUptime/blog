# How to Use Redis for Real-Time Machine Learning Inference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Machine Learning, Inference

Description: Learn how to use Redis as a feature store and result cache for real-time ML inference to serve model predictions in milliseconds using Python and RedisAI.

---

Redis fits into machine learning pipelines as a low-latency feature store, prediction cache, and model server. For real-time inference, pre-computing features and caching predictions in Redis can cut response times from hundreds of milliseconds to under 5ms.

## Architecture Overview

```text
User Request --> Feature Lookup (Redis Hash) --> Model Inference --> Cache Result --> Return
                                                    |
                                             RedisAI (optional)
                                             or External Model
```

## Store Pre-Computed Features

Pre-compute user or item features during batch jobs and store them in Redis Hashes:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Store user features (run in batch job)
def store_user_features(user_id, features: dict):
    key = f"features:user:{user_id}"
    r.hset(key, mapping={k: str(v) for k, v in features.items()})
    r.expire(key, 3600)  # 1-hour TTL

store_user_features(42, {
    "age": 28,
    "country": "US",
    "purchase_count": 15,
    "avg_order_value": 67.5,
    "days_since_last_visit": 2,
})
```

## Retrieve Features and Run Inference

```python
import numpy as np

def get_user_features(r, user_id) -> np.ndarray:
    key = f"features:user:{user_id}"
    data = r.hgetall(key)
    return np.array([
        float(data.get("age", 0)),
        float(data.get("purchase_count", 0)),
        float(data.get("avg_order_value", 0)),
        float(data.get("days_since_last_visit", 0)),
    ])

# Simulate a trained model
def predict_churn(features: np.ndarray) -> float:
    weights = np.array([0.01, -0.05, -0.002, 0.03])
    score = float(np.dot(features, weights) + 0.5)
    return round(min(max(score, 0.0), 1.0), 4)

features = get_user_features(r, 42)
churn_probability = predict_churn(features)
print(f"Churn probability: {churn_probability}")
```

## Cache Predictions to Avoid Recomputation

```python
def get_or_compute_prediction(r, user_id: int) -> float:
    cache_key = f"prediction:churn:{user_id}"

    cached = r.get(cache_key)
    if cached is not None:
        return float(cached)

    features = get_user_features(r, user_id)
    prediction = predict_churn(features)

    # Cache for 10 minutes
    r.setex(cache_key, 600, prediction)
    return prediction

result = get_or_compute_prediction(r, 42)
print(f"Prediction: {result}")
```

## Serve Batch Predictions with Pipelining

```python
def batch_predict(r, user_ids: list) -> dict:
    pipe = r.pipeline(transaction=False)
    for uid in user_ids:
        pipe.get(f"prediction:churn:{uid}")
    cached_results = pipe.execute()

    predictions = {}
    uncached_ids = []

    for uid, cached in zip(user_ids, cached_results):
        if cached is not None:
            predictions[uid] = float(cached)
        else:
            uncached_ids.append(uid)

    for uid in uncached_ids:
        features = get_user_features(r, uid)
        pred = predict_churn(features)
        r.setex(f"prediction:churn:{uid}", 600, pred)
        predictions[uid] = pred

    return predictions

results = batch_predict(r, [42, 43, 44])
print(results)
```

## Stream Inference Requests with Redis Streams

```python
# Producer: enqueue inference requests
def enqueue_request(r, user_id: int):
    r.xadd('inference:requests', {'user_id': user_id})

# Consumer: process inference requests
def process_requests(r):
    last_id = '$'
    while True:
        messages = r.xread({'inference:requests': last_id}, block=1000, count=10)
        if messages:
            for _, records in messages:
                for msg_id, data in records:
                    uid = int(data['user_id'])
                    pred = get_or_compute_prediction(r, uid)
                    r.xadd('inference:results', {'user_id': uid, 'prediction': pred})
                    last_id = msg_id
```

## Summary

Redis serves as an effective feature store and prediction cache for real-time ML inference by storing pre-computed features in Hashes and caching model outputs with TTLs. Pipelining enables efficient batch lookups, and Redis Streams support async inference pipelines. This pattern reduces inference latency from seconds to milliseconds by eliminating redundant computation.
