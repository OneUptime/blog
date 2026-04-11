# How to Use Redis for Alert State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Alerting, Monitoring, State Management, Observability

Description: Manage alert firing, suppression, and deduplication state in Redis to build a reliable and low-latency alerting system.

---

Alerting systems need to track which alerts are firing, which are suppressed, and how long each has been in a given state. Storing this in Redis gives you sub-millisecond lookups, automatic expiry, and atomic state transitions - without the complexity of a dedicated state database.

## Alert State Model

Model each alert as a hash with status, timestamp, and metadata:

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

ALERT_STATES = {"pending", "firing", "resolved", "silenced"}

def set_alert_state(alert_id: str, state: str, metadata: dict = None):
    if state not in ALERT_STATES:
        raise ValueError(f"Invalid state: {state}")

    key = f"alert:{alert_id}"
    data = {
        "state": state,
        "updated_at": str(int(time.time())),
        "metadata": json.dumps(metadata or {}),
    }
    r.hset(key, mapping=data)
    if state == "resolved":
        r.expire(key, 86400)  # expire resolved alerts after 24h
    else:
        r.persist(key)

def get_alert_state(alert_id: str) -> dict:
    key = f"alert:{alert_id}"
    data = r.hgetall(key)
    if data:
        data["metadata"] = json.loads(data.get("metadata", "{}"))
    return data
```

## Deduplicating Alerts

Prevent alert storms by checking whether an alert is already firing before notifying:

```python
def fire_alert(alert_id: str, message: str) -> bool:
    current = get_alert_state(alert_id)
    if current.get("state") in ("firing", "silenced"):
        return False  # already firing or suppressed

    set_alert_state(alert_id, "firing", {"message": message})
    track_firing_alert(alert_id)
    return True  # new alert, send notification

def track_firing_alert(alert_id: str):
    r.sadd("alerts:firing", alert_id)

def resolve_alert(alert_id: str):
    set_alert_state(alert_id, "resolved")
    r.srem("alerts:firing", alert_id)

def get_all_firing_alerts() -> list:
    return list(r.smembers("alerts:firing"))
```

## Alert Silencing with TTL

Implement time-based silencing by setting a state with expiry:

```python
def silence_alert(alert_id: str, duration_seconds: int, reason: str):
    key = f"alert:{alert_id}"
    r.hset(key, mapping={
        "state": "silenced",
        "updated_at": str(int(time.time())),
        "metadata": json.dumps({"reason": reason}),
    })
    r.expire(key, duration_seconds)
    # Also track in a set for dashboard listing
    r.setex(f"silence:{alert_id}", duration_seconds, reason)

def is_silenced(alert_id: str) -> bool:
    return bool(r.exists(f"silence:{alert_id}"))
```

## Pending State for Flap Detection

Require an alert to be pending for a minimum duration before firing to reduce flapping:

```python
def evaluate_alert(alert_id: str, is_triggered: bool, for_duration: int = 60):
    if is_triggered:
        pending_key = f"alert_pending:{alert_id}"
        if not r.exists(pending_key):
            r.set(pending_key, str(int(time.time())))
            set_alert_state(alert_id, "pending")
        else:
            pending_since = int(r.get(pending_key))
            if int(time.time()) - pending_since >= for_duration:
                fire_alert(alert_id, "Condition persisted")
                r.delete(pending_key)
    else:
        r.delete(f"alert_pending:{alert_id}")
        resolve_alert(alert_id)
```

## Summary

Redis provides a fast, expiry-aware state store for alerting systems. Hash fields capture alert status and metadata, sets track firing alerts for dashboards, and TTLs handle silence windows and resolved-alert cleanup automatically. The deduplication check reduces duplicate notifications during evaluations, though true atomicity for compound read-then-write operations would require Lua scripts or transactions.
