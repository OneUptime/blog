# How to Implement Online Learning Data Buffering with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Machine Learning, Online Learning, Buffer, Stream

Description: Use Redis Lists and Streams to buffer incoming training examples for online learning models, enabling incremental model updates without storing full datasets.

---

Online learning models (like Vowpal Wabbit, River, or custom SGD models) update their weights incrementally on small batches of new data. Redis provides a fast buffer layer that accumulates incoming examples and serves them to the learning process in manageable mini-batches.

## Buffer Architecture

```text
API/Events --> Redis List (buffer) --> Training Worker (pops batches) --> Model Update
                                           |
                                    (periodically)
                                           |
                              Model weights persisted to Redis String
```

## Buffering Incoming Examples

```python
import redis
import json
import time

r = redis.Redis(host="redis", port=6379, decode_responses=True)

MAX_BUFFER_SIZE = 100_000

def buffer_example(model_name: str, features: dict, label: float):
    key = f"training_buffer:{model_name}"
    example = json.dumps({
        "features": features,
        "label": label,
        "ts": time.time()
    })

    current_size = r.llen(key)
    if current_size >= MAX_BUFFER_SIZE:
        # Drop oldest examples to prevent unbounded growth
        r.ltrim(key, 1, -1)

    r.rpush(key, example)
```

## Training Worker: Consuming Mini-Batches

```python
BATCH_SIZE = 256

def consume_training_batch(model_name: str) -> list:
    key = f"training_buffer:{model_name}"
    pipeline = r.pipeline()

    # Atomically pop up to BATCH_SIZE examples
    for _ in range(BATCH_SIZE):
        pipeline.lpop(key)

    results = pipeline.execute()
    examples = [json.loads(r) for r in results if r is not None]
    return examples

def training_loop(model, model_name: str, interval_s: float = 1.0):
    while True:
        batch = consume_training_batch(model_name)
        if len(batch) >= 10:  # minimum batch size
            X = [e["features"] for e in batch]
            y = [e["label"] for e in batch]
            model.partial_fit(X, y)
            save_model_weights(model, model_name)

        time.sleep(interval_s)
```

## Saving Model Weights to Redis

```python
import pickle
import base64

def save_model_weights(model, model_name: str):
    weights_bytes = pickle.dumps(model)
    r.set(
        f"model_weights:{model_name}",
        base64.b64encode(weights_bytes).decode(),
        ex=86400  # expire after 24 hours as safety net
    )
    r.hset(f"model_meta:{model_name}", mapping={
        "updated_at": str(int(time.time())),
        "buffer_consumed": str(r.llen(f"training_buffer:{model_name}"))
    })

def load_model_weights(model_name: str):
    raw = r.get(f"model_weights:{model_name}")
    if not raw:
        return None
    return pickle.loads(base64.b64decode(raw))
```

## Monitoring Buffer Size

```python
def get_buffer_stats(model_name: str) -> dict:
    key = f"training_buffer:{model_name}"
    size = r.llen(key)
    meta = r.hgetall(f"model_meta:{model_name}")
    return {
        "buffer_size": size,
        "last_updated": meta.get("updated_at"),
        "pct_full": round(size / MAX_BUFFER_SIZE * 100, 1)
    }
```

```bash
# Quick check from CLI
redis-cli LLEN training_buffer:fraud_model
```

## Handling Backpressure

If the buffer fills faster than the training worker can consume, implement backpressure:

```python
def buffer_example_with_backpressure(model_name: str, features: dict, label: float):
    key = f"training_buffer:{model_name}"
    size = r.llen(key)

    if size > MAX_BUFFER_SIZE * 0.9:
        # Drop or route to slower storage
        raise BufferFullError(f"Training buffer at {size}/{MAX_BUFFER_SIZE}")

    r.rpush(key, json.dumps({"features": features, "label": label}))
```

## Using Redis Streams Instead of Lists

For durability and consumer group semantics, use Streams:

```python
def buffer_to_stream(model_name: str, features: dict, label: float):
    r.xadd(
        f"training_stream:{model_name}",
        {"features": json.dumps(features), "label": str(label)},
        maxlen=MAX_BUFFER_SIZE
    )
```

Streams guarantee at-least-once delivery even if the training worker crashes.

## Summary

Redis Lists and Streams both work as online learning data buffers. Lists are simpler with LPOP/RPUSH, while Streams provide consumer groups and durability. Keep buffer size bounded with LTRIM or MAXLEN to prevent memory exhaustion. Store trained model weights back in Redis as serialized bytes so inference services always have access to the latest weights without a filesystem dependency.
