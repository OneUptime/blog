# How to Use Dapr State Management for User Preferences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, User Preferences, Microservice, Personalization

Description: Learn how to store and retrieve user preferences using Dapr State Management, including partial updates, defaults, and cross-service access patterns.

---

## Introduction

User preferences (theme, language, notification settings, dashboard layout) are small but important state entries that should be fast to read, durable, and available to multiple services. Dapr State Management is an excellent fit: one API call to save preferences, another to retrieve them, with no schema migration or dedicated database needed.

## Data Model

```json
{
  "userId": "usr-42",
  "theme": "dark",
  "language": "en-US",
  "timezone": "America/New_York",
  "notifications": {
    "email": true,
    "push": false,
    "digest": "weekly"
  },
  "dashboard": {
    "layout": "grid",
    "widgets": ["metrics", "alerts", "logs"]
  },
  "updatedAt": "2026-03-31T10:00:00Z"
}
```

## State Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: prefs-store
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master:6379
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: redis-password
    - name: keyPrefix
      value: none
```

## Preferences Service Implementation

```python
# preferences_service.py
import json
import time
from flask import Flask, request, jsonify
from dapr.clients import DaprClient

app = Flask(__name__)
STORE = "prefs-store"

DEFAULT_PREFERENCES = {
    "theme": "light",
    "language": "en-US",
    "timezone": "UTC",
    "notifications": {
        "email": True,
        "push": True,
        "digest": "daily"
    },
    "dashboard": {
        "layout": "list",
        "widgets": ["metrics"]
    }
}

def prefs_key(user_id: str) -> str:
    return f"prefs:{user_id}"


@app.route("/preferences/<user_id>", methods=["GET"])
def get_preferences(user_id: str):
    with DaprClient() as client:
        result = client.get_state(STORE, prefs_key(user_id))
        if not result.data:
            # Return defaults for new users
            return jsonify({**DEFAULT_PREFERENCES, "userId": user_id}), 200
        prefs = json.loads(result.data)
        return jsonify(prefs), 200


@app.route("/preferences/<user_id>", methods=["PUT"])
def set_preferences(user_id: str):
    """Full replace of preferences."""
    prefs = request.get_json()
    prefs["userId"] = user_id
    prefs["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with DaprClient() as client:
        client.save_state(
            store_name=STORE,
            key=prefs_key(user_id),
            value=json.dumps(prefs)
        )
    return jsonify(prefs), 200


@app.route("/preferences/<user_id>", methods=["PATCH"])
def update_preferences(user_id: str):
    """Partial update - merge changes into existing preferences."""
    updates = request.get_json()

    with DaprClient() as client:
        result = client.get_state(STORE, prefs_key(user_id))
        current = json.loads(result.data) if result.data else {
            **DEFAULT_PREFERENCES, "userId": user_id
        }

        # Deep merge
        def deep_merge(base: dict, update: dict) -> dict:
            for key, val in update.items():
                if key in base and isinstance(base[key], dict) and isinstance(val, dict):
                    deep_merge(base[key], val)
                else:
                    base[key] = val
            return base

        merged = deep_merge(current, updates)
        merged["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        client.save_state(
            store_name=STORE,
            key=prefs_key(user_id),
            value=json.dumps(merged),
            etag=result.etag
        )
        return jsonify(merged), 200


@app.route("/preferences/<user_id>", methods=["DELETE"])
def reset_preferences(user_id: str):
    """Reset to defaults by deleting the stored preferences."""
    with DaprClient() as client:
        client.delete_state(STORE, prefs_key(user_id))
    return jsonify({**DEFAULT_PREFERENCES, "userId": user_id}), 200
```

## Bulk Preferences Load for Dashboard

When loading a personalized dashboard, fetch preferences once:

```bash
# Bulk get preferences for multiple users (admin use case)
curl -X POST http://localhost:3500/v1.0/state/prefs-store/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "keys": ["prefs:usr-1", "prefs:usr-2", "prefs:usr-3"],
    "parallelism": 5
  }'
```

## Cross-Service Preferences Access

Multiple services may need to read user preferences (recommendation engine, notification service, analytics). Share the state store with `keyPrefix: none` and scope access:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: prefs-store
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master:6379
    - name: keyPrefix
      value: none
scopes:
  - preferences-service   # writes
  - notification-service  # reads
  - recommendation-engine # reads
  - analytics-service     # reads
```

Non-scoped services receive an `ERR_COMPONENT_NOT_FOUND` error when attempting to access this component.

## Caching Preferences for Performance

Since preferences change infrequently but are read on every request, cache them in a faster store:

```python
_prefs_cache = {}
CACHE_TTL = 60  # seconds

def get_preferences_cached(user_id: str) -> dict:
    cache_key = f"prefs:{user_id}"
    cached = _prefs_cache.get(cache_key)
    if cached and time.time() - cached["ts"] < CACHE_TTL:
        return cached["data"]

    with DaprClient() as client:
        result = client.get_state(STORE, cache_key)
        prefs = json.loads(result.data) if result.data else DEFAULT_PREFERENCES

    _prefs_cache[cache_key] = {"data": prefs, "ts": time.time()}
    return prefs
```

## HTTP API Usage Examples

```bash
# Get preferences (returns defaults if not set)
curl http://localhost:5000/preferences/usr-42

# Set full preferences
curl -X PUT http://localhost:5000/preferences/usr-42 \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark", "language": "fr-FR", "timezone": "Europe/Paris"}'

# Partial update - only change theme
curl -X PATCH http://localhost:5000/preferences/usr-42 \
  -H "Content-Type: application/json" \
  -d '{"theme": "light"}'

# Reset to defaults
curl -X DELETE http://localhost:5000/preferences/usr-42
```

## Summary

Dapr State Management is ideal for user preferences: the data is small, read-heavy, and rarely conflicts. Store preferences under a `prefs:{userId}` key, return `DEFAULT_PREFERENCES` for new users to avoid null checks throughout the application, implement a PATCH endpoint with deep-merge for partial updates, and share the store across services using component scoping. For high-traffic scenarios, add a short-lived in-process cache to avoid hitting the sidecar on every request.
