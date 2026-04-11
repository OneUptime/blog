# How to Implement Config Change Notifications with Redis Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Configuration, Change Notification, Distributed System

Description: Learn how to broadcast configuration changes across distributed services instantly using Redis Pub/Sub so all instances reload settings without restarts.

---

## The Problem: Distributed Config Synchronization

In a distributed system with multiple service instances, updating a configuration value in a database or file requires restarting each instance or polling for changes. Redis Pub/Sub enables instant push notifications to all subscribers, eliminating polling and restart overhead.

## Architecture

```text
Config Change API -> Redis SET + PUBLISH
All Service Instances -> SUBSCRIBE (receive update, reload local config)
```

## Config Store and Publisher

```python
from redis import Redis
import json
import time

r = Redis(decode_responses=True)

CONFIG_CHANNEL = "config:updates"

def set_config(key: str, value, source: str = "api"):
    old_value = r.hget("config:store", key)
    r.hset("config:store", key, json.dumps(value))
    r.hset("config:meta", key, json.dumps({
        "updated_at": int(time.time()),
        "updated_by": source
    }))

    # Publish change notification to all subscribers
    notification = json.dumps({
        "key": key,
        "value": value,
        "old_value": json.loads(old_value) if old_value else None,
        "timestamp": int(time.time()),
        "source": source
    })
    subscriber_count = r.publish(CONFIG_CHANNEL, notification)
    return subscriber_count

def get_config(key: str, default=None):
    raw = r.hget("config:store", key)
    return json.loads(raw) if raw is not None else default

def get_all_config() -> dict:
    raw = r.hgetall("config:store")
    return {k: json.loads(v) for k, v in raw.items()}
```

## Config Subscriber with Local Cache

Each service instance maintains a local in-memory copy and listens for changes:

```python
import threading

class ConfigManager:
    def __init__(self):
        self._config = {}
        self._lock = threading.RLock()
        self._callbacks = {}
        self._load_all()
        self._start_listener()

    def _load_all(self):
        with self._lock:
            self._config = get_all_config()

    def _start_listener(self):
        def listen():
            sub_client = Redis(decode_responses=True)
            pubsub = sub_client.pubsub()
            pubsub.subscribe(CONFIG_CHANNEL)
            for message in pubsub.listen():
                if message["type"] == "message":
                    self._handle_update(json.loads(message["data"]))

        thread = threading.Thread(target=listen, daemon=True)
        thread.start()

    def _handle_update(self, notification: dict):
        key = notification["key"]
        value = notification["value"]
        with self._lock:
            self._config[key] = value

        # Call registered callbacks
        if key in self._callbacks:
            for callback in self._callbacks[key]:
                try:
                    callback(key, value, notification.get("old_value"))
                except Exception as e:
                    print(f"Callback error for {key}: {e}")

    def get(self, key: str, default=None):
        with self._lock:
            return self._config.get(key, default)

    def on_change(self, key: str, callback):
        if key not in self._callbacks:
            self._callbacks[key] = []
        self._callbacks[key].append(callback)

# Singleton config manager
config = ConfigManager()
```

## Using the Config Manager

```python
# Register a callback for rate limit changes
def on_rate_limit_change(key, new_value, old_value):
    print(f"Rate limit changed: {old_value} -> {new_value}")
    update_rate_limiter(new_value)

config.on_change("rate_limit_requests_per_minute", on_rate_limit_change)

# Read config values (served from local cache, no Redis round trip)
max_requests = config.get("rate_limit_requests_per_minute", default=100)
feature_enabled = config.get("feature.dark_mode", default=False)
```

## Pattern-Based Subscriptions (Keyspace Notifications)

Use Redis keyspace notifications to watch for any config key change without explicit publishing:

```bash
# Enable keyevent notifications for hash commands at runtime
CONFIG SET notify-keyspace-events Eh
```

```python
def watch_keyspace(pattern: str = "__keyevent@0__:hset"):
    sub_client = Redis(decode_responses=True)
    pubsub = sub_client.pubsub()
    pubsub.psubscribe(pattern)
    for message in pubsub.listen():
        if message["type"] == "pmessage":
            affected_key = message["data"]
            print(f"Key changed: {affected_key}")
```

## FastAPI Config API

```python
from fastapi import FastAPI

app = FastAPI()
config_manager = ConfigManager()

@app.get("/config/{key}")
def read_config(key: str):
    return {"key": key, "value": config_manager.get(key)}

@app.put("/config/{key}")
def update_config(key: str, value: dict):
    subscriber_count = set_config(key, value["value"], source="api")
    return {
        "key": key,
        "value": value["value"],
        "notified_instances": subscriber_count
    }

@app.get("/config")
def all_config():
    return get_all_config()
```

## Summary

Redis Pub/Sub enables instant configuration change notifications across all service instances without polling. A local in-memory cache backed by a background subscriber thread means config reads have zero network latency while still reflecting changes within milliseconds. Registering change callbacks per config key enables targeted reactions like refreshing rate limiters or toggling feature flags.
