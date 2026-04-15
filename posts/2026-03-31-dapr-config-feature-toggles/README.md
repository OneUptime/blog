# How to Use Dapr Configuration for Microservice Feature Toggles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Feature Toggle, Microservice, Redis

Description: Use the Dapr Configuration API to implement feature toggles in microservices, enabling runtime flag updates without redeployment or service restarts.

---

Feature toggles let you enable or disable functionality at runtime without deploying new code. The Dapr Configuration API is an ideal mechanism for this - it supports reading and subscribing to key-value config updates, making it a lightweight alternative to dedicated feature flag services.

## Setting Up the Configuration Store

Define a Redis-backed configuration component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: featurestore
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    value: ""
```

## Seeding Feature Flags

Populate Redis with feature flags in the expected format:

```bash
redis-cli MSET \
  "enable-new-checkout" "false||1" \
  "dark-mode" "true||1" \
  "beta-api" "false||1"
```

## Reading Feature Flags at Startup

Fetch all flags when your service starts:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

const FLAGS = ["enable-new-checkout", "dark-mode", "beta-api"];
let featureFlags = {};

async function loadFlags() {
  const result = await client.configuration.get("featurestore", FLAGS);
  for (const [key, entry] of Object.entries(result.items)) {
    featureFlags[key] = entry.value === "true";
  }
  console.log("Feature flags loaded:", featureFlags);
}
loadFlags();
```

## Subscribing to Runtime Flag Changes

Subscribe so flag changes propagate without restarting the service:

```javascript
async function watchFlags() {
  const sub = await client.configuration.subscribeWithKeys(
    "featurestore",
    FLAGS,
    (update) => {
      for (const [key, entry] of Object.entries(update.items)) {
        featureFlags[key] = entry.value === "true";
        console.log(`Flag updated: ${key} = ${featureFlags[key]}`);
      }
    }
  );
}
watchFlags();
```

## Using Flags in Application Logic

Check flags inline in your route handlers:

```javascript
app.post("/checkout", (req, res) => {
  if (featureFlags["enable-new-checkout"]) {
    return newCheckoutHandler(req, res);
  }
  return legacyCheckoutHandler(req, res);
});
```

## Toggling a Flag at Runtime

Flip a feature flag by updating Redis directly or through a management service:

```bash
redis-cli SET "enable-new-checkout" "true||2"
```

The subscription callback fires promptly via Redis keyspace notifications, updating `featureFlags` across all running instances sharing the same config store.

## Organizing Flags with Namespaces

Use key prefixes to group flags by team or domain:

```bash
redis-cli MSET \
  "payments:new-processor" "false||1" \
  "ui:dark-mode" "true||1"
```

Query by prefix to load only relevant flags per service.

## Summary

Dapr Configuration provides a simple, sidecar-based mechanism for implementing feature toggles in microservices. By subscribing to config key changes, services receive near-instant updates to feature flags without restarts. This pattern decouples deployment from feature release and works across any language supported by the Dapr SDK.
