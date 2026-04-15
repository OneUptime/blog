# How to Use Dapr Configuration with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Node.js, Dynamic Config, Microservice

Description: Learn how to read and subscribe to dynamic configuration in Node.js using the Dapr Configuration API for real-time feature flags and settings.

---

## Introduction

Dapr's Configuration building block lets Node.js services read application settings from external stores and react to changes without redeployment. This is ideal for feature flags, rate limits, and other settings that need to update at runtime.

## Installing the SDK

```bash
npm install @dapr/dapr
```

## Configuring the Configuration Store

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
      value: localhost:6379
    - name: redisPassword
      value: ""
```

## Reading Configuration Values

```javascript
const { DaprClient, CommunicationProtocolEnum } = require("@dapr/dapr");

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});

async function loadConfig() {
  const config = await client.configuration.get("configstore", [
    "feature-new-ui",
    "max-requests-per-second",
    "maintenance-mode",
  ]);

  return {
    newUiEnabled: config.items["feature-new-ui"]?.value === "true",
    maxRps: parseInt(config.items["max-requests-per-second"]?.value ?? "100"),
    maintenance: config.items["maintenance-mode"]?.value === "true",
  };
}
```

## Subscribing to Configuration Changes

Subscribe to live updates for specific keys:

```javascript
let appConfig = {};

async function watchConfig() {
  const stream = await client.configuration.subscribeWithKeys(
    "configstore",
    ["feature-new-ui", "max-requests-per-second"],
    async (update) => {
      const items = update.items;

      if (items["feature-new-ui"]) {
        appConfig.newUiEnabled = items["feature-new-ui"].value === "true";
        console.log("Feature flag updated:", appConfig.newUiEnabled);
      }

      if (items["max-requests-per-second"]) {
        appConfig.maxRps = parseInt(items["max-requests-per-second"].value);
        console.log("Rate limit updated:", appConfig.maxRps);
      }
    }
  );

  console.log("Subscribed to config updates");
  return stream;
}
```

## Unsubscribing from Updates

```javascript
function stopWatching(stream) {
  stream.stop();
  console.log("Unsubscribed from config updates");
}
```

## Integrating into Express.js Middleware

Use configuration values in Express middleware:

```javascript
const express = require("express");
const app = express();

app.use(async (req, res, next) => {
  if (appConfig.maintenance) {
    return res.status(503).json({
      error: "Service under maintenance. Please try again later.",
    });
  }
  next();
});

app.get("/ui", (req, res) => {
  if (appConfig.newUiEnabled) {
    return res.sendFile("new-ui.html");
  }
  return res.sendFile("old-ui.html");
});
```

## Startup Sequence

```javascript
async function main() {
  // Load initial config
  appConfig = await loadConfig();

  // Subscribe to changes
  const stream = await watchConfig();

  // Start server
  app.listen(3000, () => {
    console.log("Server started on port 3000");
  });

  // Clean up on exit
  process.on("SIGTERM", () => {
    stopWatching(stream);
    process.exit(0);
  });
}

main().catch(console.error);
```

## Summary

Dapr's Configuration API in Node.js allows services to read dynamic settings at startup and subscribe to live changes. By combining initial reads with subscriptions, your Node.js services can react to feature flag and configuration updates in real time without restarts or redeployment.
