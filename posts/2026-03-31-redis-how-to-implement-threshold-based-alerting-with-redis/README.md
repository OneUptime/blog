# How to Implement Threshold-Based Alerting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Alerting, Threshold, Monitoring, Pub/Sub

Description: Implement threshold-based alerting with Redis to detect when metrics exceed defined limits and fire notifications using atomic counters and Pub/Sub.

---

## Overview

Threshold-based alerting fires an alert when a metric crosses a defined boundary - for example, when error rate exceeds 5%, latency exceeds 500ms, or queue depth exceeds 10,000 items. Redis provides atomic metric storage, configurable thresholds, and Pub/Sub for real-time alert dispatch.

## Threshold Configuration

```python
import json
import time
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

ALERTS_CHANNEL = "alerts:triggered"

def configure_threshold(
    metric_name: str,
    threshold: float,
    comparison: str = "gt",  # gt, lt, gte, lte
    severity: str = "warning",  # info, warning, critical
    cooldown_seconds: int = 300,  # Prevent alert storms
    description: str = ""
):
    """Define a threshold alert rule."""
    rule = {
        "metric": metric_name,
        "threshold": str(threshold),
        "comparison": comparison,
        "severity": severity,
        "cooldown": str(cooldown_seconds),
        "description": description,
        "enabled": "1",
        "created_at": str(int(time.time()))
    }
    r.hset(f"alert_rule:{metric_name}", mapping=rule)
    r.sadd("alert_rules:all", metric_name)

# Define alert rules
configure_threshold("error_rate", 0.05, "gte", "critical", 300, "Error rate >= 5%")
configure_threshold("api_latency_p99", 500, "gt", "warning", 60, "P99 latency > 500ms")
configure_threshold("queue_depth", 10000, "gte", "warning", 120, "Job queue depth >= 10k")
configure_threshold("memory_usage_pct", 90, "gte", "critical", 600, "Memory > 90%")
```

## Recording Metrics and Checking Thresholds

```python
def record_metric(metric_name: str, value: float) -> dict | None:
    """Record a metric value and check if it triggers an alert."""
    # Store current value
    r.hset(f"metric:{metric_name}", mapping={
        "value": str(value),
        "timestamp": str(int(time.time()))
    })

    # Get the alert rule
    rule = r.hgetall(f"alert_rule:{metric_name}")
    if not rule or rule.get("enabled") != "1":
        return None

    threshold = float(rule["threshold"])
    comparison = rule["comparison"]

    # Evaluate threshold condition
    triggered = False
    if comparison == "gt" and value > threshold:
        triggered = True
    elif comparison == "gte" and value >= threshold:
        triggered = True
    elif comparison == "lt" and value < threshold:
        triggered = True
    elif comparison == "lte" and value <= threshold:
        triggered = True

    if not triggered:
        # Clear any existing alert state
        r.delete(f"alert:active:{metric_name}")
        return None

    # Check cooldown to prevent alert storms
    cooldown_key = f"alert:cooldown:{metric_name}"
    if r.exists(cooldown_key):
        return None  # In cooldown period

    # Fire alert
    alert = {
        "metric": metric_name,
        "value": value,
        "threshold": threshold,
        "comparison": comparison,
        "severity": rule["severity"],
        "description": rule["description"],
        "fired_at": int(time.time())
    }

    # Set cooldown
    r.set(cooldown_key, "1", ex=int(rule["cooldown"]))

    # Store active alert
    r.hset(f"alert:active:{metric_name}", mapping={
        k: str(v) for k, v in alert.items()
    })

    # Publish to alert channel
    r.publish(ALERTS_CHANNEL, json.dumps(alert))

    # Add to alert history
    r.lpush("alerts:history", json.dumps(alert))
    r.ltrim("alerts:history", 0, 999)  # Keep last 1000 alerts

    return alert
```

## Batch Metric Processing

```python
def record_metrics_batch(metrics: dict[str, float]) -> list[dict]:
    """Record multiple metrics at once, return any triggered alerts."""
    alerts = []
    for metric_name, value in metrics.items():
        alert = record_metric(metric_name, value)
        if alert:
            alerts.append(alert)
    return alerts

# Example: record system metrics
triggered = record_metrics_batch({
    "error_rate": 0.08,       # Triggers critical alert
    "api_latency_p99": 250,   # OK
    "queue_depth": 15000,     # Triggers warning
    "memory_usage_pct": 72    # OK
})
```

## Alert Subscriber

```python
import threading

class AlertHandler:
    def __init__(self):
        self._start_subscriber()

    def _start_subscriber(self):
        def listen():
            sub = r.pubsub()
            sub.subscribe(ALERTS_CHANNEL)
            for message in sub.listen():
                if message["type"] == "message":
                    try:
                        alert = json.loads(message["data"])
                        self.handle_alert(alert)
                    except Exception:
                        pass

        thread = threading.Thread(target=listen, daemon=True)
        thread.start()

    def handle_alert(self, alert: dict):
        severity = alert.get("severity", "info")
        metric = alert["metric"]
        value = alert["value"]
        threshold = alert["threshold"]

        print(f"[{severity.upper()}] {metric}: {value} (threshold: {threshold})")

        if severity == "critical":
            self.send_pagerduty(alert)
        elif severity == "warning":
            self.send_slack(alert)

    def send_slack(self, alert: dict):
        """Send Slack notification (stub)."""
        pass

    def send_pagerduty(self, alert: dict):
        """Page on-call engineer (stub)."""
        pass

handler = AlertHandler()
```

## Alert Dashboard

```python
def get_active_alerts() -> list[dict]:
    """Get all currently active alerts."""
    rule_names = r.smembers("alert_rules:all")
    active = []
    for name in rule_names:
        alert = r.hgetall(f"alert:active:{name}")
        if alert:
            active.append(alert)
    return sorted(active, key=lambda a: a.get("severity", ""), reverse=True)

def get_alert_history(limit: int = 50) -> list[dict]:
    """Get recent alert history."""
    raw = r.lrange("alerts:history", 0, limit - 1)
    return [json.loads(a) for a in raw]

def get_metric_status(metric_name: str) -> dict:
    """Get current metric value and alert status."""
    metric = r.hgetall(f"metric:{metric_name}")
    rule = r.hgetall(f"alert_rule:{metric_name}")
    in_cooldown = r.exists(f"alert:cooldown:{metric_name}")
    active_alert = r.hgetall(f"alert:active:{metric_name}")

    return {
        "metric": metric_name,
        "current_value": float(metric.get("value", 0)) if metric else None,
        "threshold": float(rule["threshold"]) if rule else None,
        "severity": rule.get("severity") if rule else None,
        "in_cooldown": bool(in_cooldown),
        "active_alert": bool(active_alert)
    }
```

## Summary

Redis threshold alerting combines metric storage with Pub/Sub notification dispatch to provide near-real-time alerting. Cooldown keys prevent alert storms during sustained incidents, while the alert history list provides an audit trail. Note that the cooldown check and set shown here are not atomic across multiple commands, so concurrent writers could produce duplicate alerts. For production use with multiple application instances, wrap the cooldown check and alert dispatch in a Lua script or use `SET NX` to atomically claim the cooldown key.
