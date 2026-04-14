# How to Implement Feature Flags with Dapr Configuration API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration API, Feature Flag, Dynamic Configuration, Microservice

Description: Learn how to implement feature flags using the Dapr Configuration API backed by Redis, enabling dynamic feature toggles across microservices without restarts.

---

Feature flags decouple code deployment from feature release: you ship code with a flag that is off by default, then enable it for specific users or gradually roll it out. Traditional feature flag solutions require separate services or SDKs. Dapr's Configuration API provides a simpler alternative: store feature flags as key-value entries in a configuration store (Redis, Azure App Configuration, or Consul) and subscribe to real-time updates so microservices react instantly when a flag changes.

## How the Dapr Configuration API Works

The Configuration API is built on top of a key-value configuration store (not to be confused with the state store). Key differences from the state store:

- Read-only from the application's perspective (you manage configuration externally)
- Supports subscriptions: Dapr pushes updates to your app when keys change
- Ideal for configuration data that changes infrequently but must propagate quickly

```text
Config Change (Redis CLI / API)
        |
        v
  Redis (config store)
        |
  Dapr sidecar watches for changes
        |  (subscription stream)
        v
  Your app receives HTTP callback
        |
  Feature flag updated in memory
```

## Setting Up the Configuration Component

```yaml
# components/configstore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: configstore
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
  - name: enableTLS
    value: "false"
```

Seed initial feature flags in Redis:

```bash
# Set feature flags via Redis CLI
redis-cli set "feature.new-checkout-flow" "false"
redis-cli set "feature.ai-recommendations" "false"
redis-cli set "feature.dark-mode" "true"
redis-cli set "feature.payment-v2" "false"

# Or set as JSON for richer configuration
redis-cli set "feature.new-checkout-flow" '{"enabled":false,"rolloutPercentage":0,"allowlist":[]}'
```

## Implementing the Feature Flag Service

```python
# feature_flags.py
import hashlib
import json
import os
import threading
import requests
from flask import Flask, request, jsonify
from typing import Any

app = Flask(__name__)

DAPR_PORT = int(os.environ.get("DAPR_HTTP_PORT", 3500))
DAPR_URL = f"http://localhost:{DAPR_PORT}/v1.0"
CONFIG_STORE = "configstore"

# In-memory feature flag cache
_flag_cache: dict[str, Any] = {}
_cache_lock = threading.Lock()

def load_initial_flags():
    """Load all feature flags on startup."""
    flag_keys = [
        "feature.new-checkout-flow",
        "feature.ai-recommendations",
        "feature.dark-mode",
        "feature.payment-v2"
    ]
    
    keys_param = "&".join(f"key={k}" for k in flag_keys)
    resp = requests.get(
        f"{DAPR_URL}/configuration/{CONFIG_STORE}?{keys_param}"
    )
    
    if resp.status_code == 200:
        items = resp.json()
        with _cache_lock:
            for key, item in items.items():
                raw_value = item.get("value", "false")
                try:
                    _flag_cache[key] = json.loads(raw_value)
                except json.JSONDecodeError:
                    _flag_cache[key] = raw_value.lower() == "true"
        print(f"Loaded {len(_flag_cache)} feature flags")
    else:
        print(f"Warning: failed to load feature flags: {resp.status_code}")

def is_enabled(flag_name: str, user_id: str = "") -> bool:
    """Check if a feature flag is enabled for a given user."""
    with _cache_lock:
        value = _flag_cache.get(f"feature.{flag_name}", False)
    
    if isinstance(value, bool):
        return value
    
    if isinstance(value, dict):
        if not value.get("enabled", False):
            return False
        
        # Check allowlist
        allowlist = value.get("allowlist", [])
        if user_id and user_id in allowlist:
            return True
        
        # Check rollout percentage
        rollout_pct = value.get("rolloutPercentage", 0)
        if rollout_pct > 0 and user_id:
            # Consistent hash-based rollout
            user_hash = int(hashlib.sha256(user_id.encode()).hexdigest(), 16) % 100
            return user_hash < rollout_pct
        
        return value.get("enabled", False)
    
    return False

# Dapr configuration subscription callback
@app.route("/configuration/configstore/<subscription_id>", methods=["POST"])
def handle_config_update(subscription_id: str):
    """Dapr calls this when watched configuration keys change."""
    update = request.json
    items = update.get("items", {})
    
    print(f"Configuration update received: {list(items.keys())}")
    
    with _cache_lock:
        for key, item in items.items():
            raw_value = item.get("value", "false")
            try:
                new_value = json.loads(raw_value)
            except json.JSONDecodeError:
                new_value = raw_value.lower() == "true"
            
            old_value = _flag_cache.get(key)
            _flag_cache[key] = new_value
            print(f"Flag updated: {key} = {old_value} -> {new_value}")
    
    return jsonify({}), 200

# Subscribe to configuration updates on startup
def subscribe_to_flags():
    """Subscribe to feature flag changes via Dapr Configuration API."""
    flag_keys = [
        "feature.new-checkout-flow",
        "feature.ai-recommendations",
        "feature.dark-mode",
        "feature.payment-v2"
    ]
    
    keys_param = "&".join(f"key={k}" for k in flag_keys)
    resp = requests.get(
        f"{DAPR_URL}/configuration/{CONFIG_STORE}/subscribe?{keys_param}"
    )
    
    if resp.status_code == 200:
        subscription_id = resp.json().get("id")
        print(f"Subscribed to feature flag updates: {subscription_id}")
        return subscription_id
    else:
        print(f"Warning: failed to subscribe to flags: {resp.status_code}")
        return None

# Application routes using feature flags
@app.route("/checkout", methods=["POST"])
def checkout():
    user_id = request.json.get("userId", "")
    
    if is_enabled("new-checkout-flow", user_id):
        return jsonify({"flow": "v2", "message": "Using new checkout experience"})
    else:
        return jsonify({"flow": "v1", "message": "Using classic checkout"})

@app.route("/recommendations", methods=["GET"])
def get_recommendations():
    user_id = request.args.get("userId", "")
    
    if is_enabled("ai-recommendations", user_id):
        # Return AI-powered recommendations
        return jsonify({"engine": "ai", "items": ["item-1", "item-2", "item-3"]})
    else:
        # Return rule-based recommendations
        return jsonify({"engine": "rules", "items": ["item-a", "item-b"]})

@app.route("/flags", methods=["GET"])
def list_flags():
    """Debug endpoint to see current flag state."""
    with _cache_lock:
        return jsonify(_flag_cache)

if __name__ == "__main__":
    load_initial_flags()
    subscribe_to_flags()
    app.run(host="0.0.0.0", port=5000)
```

## Toggling Feature Flags

Change a feature flag without restarting any services:

```bash
# Enable new checkout flow for all users
redis-cli set "feature.new-checkout-flow" "true"

# Roll out AI recommendations to 10% of users
redis-cli set "feature.ai-recommendations" \
  '{"enabled":true,"rolloutPercentage":10,"allowlist":["beta-user-1","beta-user-2"]}'

# Disable a feature immediately (instant kill switch)
redis-cli set "feature.payment-v2" "false"

# Verify the flag changed in a running service
curl http://localhost:5000/flags
```

## Using Azure App Configuration as the Backend

For production, Azure App Configuration provides feature flag management UI, label-based environments, and audit logs:

```yaml
# components/azure-configstore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: configstore
spec:
  type: configuration.azure.appconfig
  version: v1
  metadata:
  - name: host
    value: "https://my-app-config.azconfig.io"
  - name: azureClientId
    value: "your-managed-identity-client-id"
```

Set flags via the Azure CLI:

```bash
az appconfig kv set \
  --name my-app-config \
  --key "feature.new-checkout-flow" \
  --value "true" \
  --label "production"
```

## Summary

The Dapr Configuration API provides a lightweight feature flag system that works with any supported backend (Redis, Azure App Configuration, Consul). Services load flags on startup and subscribe to real-time updates - when a flag changes in the config store, the Dapr sidecar immediately notifies subscribed applications via HTTP callback, updating the in-memory cache without a restart. This pattern enables instant rollbacks, percentage-based rollouts, and user-specific allowlists with no feature flag service infrastructure to manage.
