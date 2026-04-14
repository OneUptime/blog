# How to Test Dapr Configuration Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Testing, Local Development, Redis

Description: Learn how to test Dapr Configuration API locally using self-hosted mode, Redis, and the Dapr CLI to validate dynamic config changes before deploying.

---

Testing Dapr Configuration locally lets you validate dynamic configuration logic without deploying to a Kubernetes cluster. The Dapr Configuration API provides a way to read and watch key-value settings at runtime, and local testing ensures your app handles updates correctly.

## Prerequisites

Install the Dapr CLI and initialize it in self-hosted mode:

```bash
dapr init
```

This starts a local Redis instance and sets up default state store and pub/sub components. You will need to create a configuration store component separately.

## Defining the Configuration Component

Create a component file for the configuration store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: configstore
  namespace: default
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

Save this as `components/configstore.yaml`.

## Seeding Test Configuration Data

Populate Redis with test values using the Redis CLI:

```bash
redis-cli MSET \
  "feature-x" "true||1" \
  "max-retries" "5||1"
```

## Reading Configuration in Your App

Use the Dapr HTTP API to fetch config values while running locally:

```bash
curl http://localhost:3500/v1.0/configuration/configstore?key=feature-x&key=max-retries
```

Expected response:

```json
{
  "feature-x": { "value": "true" },
  "max-retries": { "value": "5" }
}
```

## Testing Configuration Subscriptions

Start your app with Dapr and subscribe to config changes:

```bash
dapr run --app-id myapp --app-port 3000 --resources-path ./components -- node app.js
```

In your app, subscribe to changes and log updates:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function watchConfig() {
  const stream = await client.configuration.subscribeWithKeys(
    "configstore",
    ["feature-x", "max-retries"],
    (update) => {
      console.log("Config updated:", update);
    }
  );
  // Stop watching after 60 seconds
  setTimeout(() => stream.stop(), 60000);
}
watchConfig();
```

## Simulating a Configuration Change

Update a key in Redis to simulate a runtime config change:

```bash
redis-cli SET "feature-x" "false||2"
```

Your subscription callback should fire with the new value within seconds.

## Running Tests with Dapr Multi-App Run

Use a `dapr.yaml` file to define the local test setup:

```yaml
version: 1
apps:
  - appID: configtest
    appDirPath: ./src
    appPort: 3000
    command: ["node", "app.js"]
    resourcesPaths: [./components]
```

Start everything with:

```bash
dapr run -f dapr.yaml
```

## Summary

Testing Dapr Configuration locally requires initializing Dapr in self-hosted mode, seeding Redis with test data, and subscribing to config keys in your application. The combination of the Dapr CLI, Redis CLI, and HTTP/SDK APIs makes it straightforward to validate dynamic configuration behavior before deploying to production.
