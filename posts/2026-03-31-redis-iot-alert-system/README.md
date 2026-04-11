# How to Build an IoT Alert System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IoT, Alert, Pub/Sub, Lua

Description: Build a real-time IoT alert system with Redis that evaluates sensor thresholds, deduplicates alerts, and routes notifications to the right channels with minimal latency.

---

IoT alerts need to fire within seconds of a threshold breach and avoid flooding operators with duplicate notifications. Redis enables real-time threshold evaluation, alert deduplication using TTL keys, and fan-out routing through Pub/Sub.

## Alert Rule Storage

Store alert rules as hashes:

```bash
HSET alert:rule:temp_high \
  device_type thermometer \
  metric temperature \
  operator gt \
  threshold 80 \
  severity critical \
  cooldown 300
```

## Threshold Evaluation

On each sensor reading, evaluate applicable rules:

```python
import redis
r = redis.Redis()

def evaluate_reading(device_id, metric, value):
    rules = get_rules_for_metric(metric)
    for rule_id, rule in rules.items():
        threshold = float(rule[b"threshold"])
        operator = rule[b"operator"].decode()
        triggered = (operator == "gt" and value > threshold) or \
                    (operator == "lt" and value < threshold)
        if triggered:
            fire_alert(device_id, rule_id, rule, value)
```

## Deduplication with TTL

Prevent alert storms by enforcing a cooldown period per device-rule pair:

```python
import json

def fire_alert(device_id, rule_id, rule, value):
    dedup_key = f"alert:active:{device_id}:{rule_id}"
    cooldown = int(rule[b"cooldown"])
    # SET NX returns True only if key did not exist
    if r.set(dedup_key, 1, ex=cooldown, nx=True):
        alert_event = {
            "device_id": device_id,
            "rule_id": rule_id,
            "value": value,
            "severity": rule[b"severity"].decode()
        }
        r.publish("alerts:new", json.dumps(alert_event))
        log_alert(device_id, rule_id, value)
```

## Alert Logging

Persist each fired alert to a sorted set ordered by timestamp:

```python
import time

def log_alert(device_id, rule_id, value):
    key = f"alerts:history:{device_id}"
    entry = f"{rule_id}:{value}:{time.time()}"
    r.zadd(key, {entry: time.time()})
    r.zremrangebyscore(key, "-inf", time.time() - 86400 * 7)  # 7-day retention
```

## Alert Routing

Subscribe to the alerts channel and route by severity:

```python
import json

def alert_router():
    pubsub = r.pubsub()
    pubsub.subscribe("alerts:new")
    for message in pubsub.listen():
        if message["type"] != "message":
            continue
        event = json.loads(message["data"].decode())
        severity = event["severity"]
        if severity == "critical":
            send_pagerduty(event)
        elif severity == "warning":
            send_slack(event)
        else:
            send_email(event)
```

## Alert Acknowledgment

Track which alerts have been acknowledged:

```bash
SET alert:ack:d-001:temp_high 1 EX 3600
```

When evaluating, skip acknowledged alerts:

```python
def is_acknowledged(device_id, rule_id):
    return r.exists(f"alert:ack:{device_id}:{rule_id}") == 1
```

## Summary

Redis delivers a fast IoT alert system through threshold evaluation against stored rules, TTL-based deduplication to prevent alert storms, and Pub/Sub for real-time routing. Sorted sets with rolling retention keep alert history manageable, while acknowledgment keys give operators a lightweight way to suppress active alerts.
