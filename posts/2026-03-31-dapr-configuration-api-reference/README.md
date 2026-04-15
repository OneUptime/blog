# How to Use the Dapr Configuration API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, API, Dynamic Config, Feature Flag

Description: A practical reference for the Dapr Configuration API covering get, subscribe, and unsubscribe operations for dynamic application configuration.

---

## Overview

The Dapr Configuration API lets applications read and subscribe to dynamic configuration values from a configuration store. Unlike static environment variables, configuration updates are pushed to subscribed applications in real time. This is ideal for feature flags, rate limits, and settings that need to change without redeployment.

## Base URL

```yaml
http://localhost:{daprPort}/v1.0/configuration/{configStoreName}
```

## Getting Configuration Values

**GET** `/v1.0/configuration/{configStoreName}?key={key1}&key={key2}`

```bash
curl "http://localhost:3500/v1.0/configuration/configstore?key=feature-checkout-v2&key=max-cart-size"
```

Response:

```json
{
  "feature-checkout-v2": {
    "value": "true",
    "version": "v3",
    "metadata": {}
  },
  "max-cart-size": {
    "value": "50",
    "version": "v1",
    "metadata": {}
  }
}
```

## Getting All Configuration Keys

Omit the `key` parameter to retrieve all keys:

```bash
curl http://localhost:3500/v1.0/configuration/configstore
```

## Subscribing to Configuration Changes

**GET** `/v1.0/configuration/{configStoreName}/subscribe?key={key}`

```bash
curl "http://localhost:3500/v1.0/configuration/configstore/subscribe?key=feature-checkout-v2"
```

Response contains a subscription ID:

```json
{
  "id": "sub-abc-12345"
}
```

## Unsubscribing

**GET** `/v1.0/configuration/{configStoreName}/{subscriptionId}/unsubscribe`

```bash
curl http://localhost:3500/v1.0/configuration/configstore/sub-abc-12345/unsubscribe
```

## Using the SDK for Subscriptions

```python
from dapr.clients import DaprClient

def handle_config_update(id, update):
    for key, item in update.items.items():
        print(f"Config updated: {key} = {item.value}")

with DaprClient() as client:
    # Get initial values
    config = client.get_configuration(
        store_name="configstore",
        keys=["feature-checkout-v2", "max-cart-size"]
    )
    print(f"Checkout v2 enabled: {config.items['feature-checkout-v2'].value}")

    # Subscribe to changes
    subscription = client.subscribe_configuration(
        store_name="configstore",
        keys=["feature-checkout-v2"],
        handler=handle_config_update
    )
```

## Redis Configuration Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: configstore
spec:
  type: configuration.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master:6379
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
```

## Updating Configuration in Redis

Update config values directly in Redis to trigger subscriber notifications:

```bash
redis-cli MSET "feature-checkout-v2" "false||1"
```

All subscribed applications receive the update within milliseconds.

## Using Config for Feature Flags

```javascript
const { DaprClient, CommunicationProtocolEnum } = require("@dapr/dapr");
const client = new DaprClient({
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});

async function isFeatureEnabled(featureName) {
  const config = await client.configuration.get("configstore", [featureName]);
  return config.items[featureName]?.value === "true";
}

app.post("/checkout", async (req, res) => {
  if (await isFeatureEnabled("feature-checkout-v2")) {
    return handleCheckoutV2(req, res);
  }
  return handleCheckoutV1(req, res);
});
```

## Summary

The Dapr Configuration API enables real-time dynamic configuration for applications without restarts. The subscribe mechanism pushes updates to all connected services, making it ideal for feature flag systems, A/B testing toggles, and operational settings. Use it alongside a Redis or etcd backend for sub-second propagation of configuration changes across your entire fleet.
