# How to Use Redis as a Metric Buffer for Observability Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Observability, Metric, Pipeline, Monitoring

Description: Use Redis lists and streams as a high-throughput metric buffer between your instrumented services and long-term storage backends.

---

Observability pipelines often face a mismatch: services emit metrics in bursts, while storage backends like Prometheus or ClickHouse prefer steady ingestion rates. Redis acts as a shock absorber - absorbing bursts and releasing data at a controlled pace.

## Why Buffer Metrics in Redis

Writing metrics directly to time-series storage under high load causes back-pressure that can block application threads. A Redis buffer decouples emission from ingestion, letting you batch writes, apply sampling, and retry on backend failures without losing data.

## Using Redis Lists as a Queue

The simplest buffer uses `LPUSH` to enqueue and `RPOP` to dequeue in FIFO order:

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def emit_metric(name: str, value: float, labels: dict):
    metric = {
        "name": name,
        "value": value,
        "labels": labels,
        "ts": int(time.time() * 1000),
    }
    r.lpush("metrics:buffer", json.dumps(metric))

def flush_metrics(batch_size: int = 500):
    pipe = r.pipeline()
    for _ in range(batch_size):
        pipe.rpop("metrics:buffer")
    results = pipe.execute()
    return [json.loads(m) for m in results if m is not None]
```

## Using Redis Streams for Durability

Streams provide acknowledgment and consumer groups, useful when you need at-least-once delivery to multiple backends:

```python
def emit_metric_stream(name: str, value: float, labels: dict):
    r.xadd("metrics:stream", {
        "name": name,
        "value": str(value),
        "labels": json.dumps(labels),
    }, maxlen=100000, approximate=True)

def consume_metrics(consumer_group: str, consumer: str, count: int = 200):
    try:
        r.xgroup_create("metrics:stream", consumer_group, id="0", mkstream=True)
    except redis.exceptions.ResponseError:
        pass  # group already exists

    entries = r.xreadgroup(
        consumer_group, consumer,
        {"metrics:stream": ">"},
        count=count,
        block=1000,
    )
    return entries or []

def ack_metrics(consumer_group: str, message_ids: list):
    if message_ids:
        r.xack("metrics:stream", consumer_group, *message_ids)
```

## Flushing to a Backend

A background worker reads from the buffer and writes batches to storage:

```python
import requests

def flush_to_victoriametrics(metrics: list):
    lines = []
    for m in metrics:
        label_str = ",".join(f'{k}="{v}"' for k, v in m["labels"].items())
        lines.append(f'{m["name"]}{{{label_str}}} {m["value"]} {m["ts"]}')
    payload = "\n".join(lines)
    requests.post("http://victoriametrics:8428/api/v1/import/prometheus",
                  data=payload, timeout=5)

def run_flush_worker(interval: int = 5):
    while True:
        metrics = flush_metrics(batch_size=500)
        if metrics:
            flush_to_victoriametrics(metrics)
        time.sleep(interval)
```

## Monitoring Buffer Depth

Track buffer depth as a metric itself to detect pipeline lag:

```bash
# Check queue depth
redis-cli llen metrics:buffer

# Check stream length
redis-cli xlen metrics:stream

# Check pending messages (unacked)
redis-cli xpending metrics:stream prometheus-consumer - + 10
```

## Summary

Redis provides a reliable, low-latency buffer between metric emitters and observability backends. Lists work for simple FIFO queues, while streams add durability and consumer group semantics for multi-backend fanout. Monitoring buffer depth gives you early warning when downstream storage is falling behind.
