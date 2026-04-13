# How to Use Dapr with Azure App Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, App Configuration, Configuration, Feature Flag

Description: Use Dapr configuration API with Azure App Configuration to read and watch dynamic configuration values and feature flags across multiple microservices.

---

Azure App Configuration is a managed service for centralized application configuration and feature flag management. Dapr's configuration building block integrates with Azure App Configuration, enabling services to read configuration values and subscribe to real-time configuration changes.

## Create an App Configuration Store

```bash
# Create App Configuration store
az appconfig create \
  --name my-dapr-appconfig \
  --resource-group my-rg \
  --location eastus \
  --sku Standard

# Add configuration values
az appconfig kv set \
  --name my-dapr-appconfig \
  --key order-service:max-retries \
  --value "3" \
  --yes

az appconfig kv set \
  --name my-dapr-appconfig \
  --key order-service:timeout-ms \
  --value "5000" \
  --yes

az appconfig kv set \
  --name my-dapr-appconfig \
  --key order-service:feature-new-checkout \
  --value "true" \
  --yes

# Get connection string
CONN_STR=$(az appconfig credential list \
  --name my-dapr-appconfig \
  --resource-group my-rg \
  --query "[?name=='Primary'].connectionString | [0]" \
  --output tsv)

kubectl create secret generic appconfig-secret \
  --from-literal=connectionString="$CONN_STR"
```

## Configure the Dapr App Configuration Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: appconfig
  namespace: default
spec:
  type: configuration.azure.appconfig
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: appconfig-secret
      key: connectionString
  - name: maxRetryDelay
    value: "30s"
  - name: retryDelay
    value: "1s"
  - name: maxRetries
    value: "3"
```

With managed identity:

```yaml
spec:
  type: configuration.azure.appconfig
  version: v1
  metadata:
  - name: host
    value: https://my-dapr-appconfig.azconfig.io
  - name: azureClientId
    value: ""
```

## Read Configuration Values

```python
import requests

def get_config(keys: list) -> dict:
    resp = requests.get(
        "http://localhost:3500/v1.0/configuration/appconfig",
        params={"key": keys}
    )
    resp.raise_for_status()
    config = resp.json()
    return {k: v["value"] for k, v in config.items()}

# Read multiple config values
config = get_config([
    "order-service:max-retries",
    "order-service:timeout-ms",
    "order-service:feature-new-checkout"
])

max_retries = int(config.get("order-service:max-retries", "3"))
timeout_ms = int(config.get("order-service:timeout-ms", "5000"))
feature_new_checkout = config.get("order-service:feature-new-checkout", "false") == "true"

print(f"Max retries: {max_retries}")
print(f"Timeout: {timeout_ms}ms")
print(f"New checkout: {feature_new_checkout}")
```

## Subscribe to Configuration Changes

```python
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# Subscribe to configuration changes
def subscribe_config(keys: list) -> str:
    resp = requests.get(
        "http://localhost:3500/v1.0/configuration/appconfig/subscribe",
        params={"key": keys}
    )
    resp.raise_for_status()
    subscription_id = resp.json()["id"]
    print(f"Subscribed with ID: {subscription_id}")
    return subscription_id

# Dapr pushes configuration changes to this endpoint
@app.route("/configuration/appconfig/<key>", methods=["POST"])
def on_config_change(key):
    change = request.json
    print(f"Config changed for {key}: {change}")
    # Reload application configuration
    config = get_config(["order-service:max-retries", "order-service:timeout-ms"])
    print(f"Configuration reloaded: {config}")
    return jsonify({"status": "ok"}), 200

# Unsubscribe when no longer needed
def unsubscribe_config(subscription_id: str):
    resp = requests.get(
        f"http://localhost:3500/v1.0/configuration/appconfig/{subscription_id}/unsubscribe"
    )
    resp.raise_for_status()
    print(f"Unsubscribed: {subscription_id}")

sub_id = subscribe_config(["order-service:max-retries"])
app.run(port=5001)
```

## Update Configuration Values

```bash
# Update a config value - subscribed services will receive change notification
az appconfig kv set \
  --name my-dapr-appconfig \
  --key order-service:max-retries \
  --value "5" \
  --yes

# Toggle a feature flag
az appconfig kv set \
  --name my-dapr-appconfig \
  --key order-service:feature-new-checkout \
  --value "false" \
  --yes
```

## Summary

Dapr's Azure App Configuration integration provides centralized configuration management with real-time change notifications for all microservices. Services read configuration values through the Dapr configuration API, and subscriptions allow services to react to configuration changes without restart. This enables dynamic feature flagging, tunable timeouts, and environment-specific settings managed from a single App Configuration store.
