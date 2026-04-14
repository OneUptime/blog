# How to Use the Dapr Metadata API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Metadata, API, Diagnostic, Runtime

Description: A practical reference for the Dapr Metadata API covering how to retrieve runtime metadata, active actors, subscriptions, and custom attributes.

---

## Overview

The Dapr Metadata API returns runtime information about the Dapr sidecar, including loaded components, active subscriptions, registered actor types, and custom application metadata. It is useful for diagnostics, dashboards, and service discovery tooling.

## Getting Sidecar Metadata

**GET** `/v1.0/metadata`

```bash
curl http://localhost:3500/v1.0/metadata
```

Sample response:

```json
{
  "id": "order-service",
  "actorRuntime": {
    "runtimeStatus": "RUNNING",
    "activeActors": [
      {
        "type": "OrderActor",
        "count": 42
      }
    ],
    "hostReady": true,
    "placement": "placement:50005"
  },
  "components": [
    {
      "name": "statestore",
      "type": "state.redis",
      "version": "v1",
      "capabilities": ["ETAG", "TRANSACTIONAL", "QUERY_API"]
    },
    {
      "name": "pubsub",
      "type": "pubsub.redis",
      "version": "v1",
      "capabilities": ["SUBSCRIBE_WILDCARDS"]
    }
  ],
  "subscriptions": [
    {
      "type": "DECLARATIVE",
      "pubsubname": "pubsub",
      "topic": "orders",
      "rules": [
        {
          "match": "",
          "path": "/orders-handler"
        }
      ],
      "deadLetterTopic": "",
      "metadata": {}
    }
  ],
  "extended": {}
}
```

## Checking Registered Components

Parse the components list to verify expected components are loaded:

```bash
curl -s http://localhost:3500/v1.0/metadata | jq '.components[].name'
```

Expected output:

```text
"statestore"
"pubsub"
"vault"
```

## Checking Active Subscriptions

```bash
curl -s http://localhost:3500/v1.0/metadata | jq '.subscriptions'
```

## Checking Actor Counts

```bash
curl -s http://localhost:3500/v1.0/metadata | jq '.actorRuntime.activeActors'
```

## Setting Custom Metadata

**PUT** `/v1.0/metadata/{attributeName}`

Store custom attributes on the sidecar for service discovery or health signaling:

```bash
curl -X PUT http://localhost:3500/v1.0/metadata/app-version \
  -H "Content-Type: text/plain" \
  -d "2.5.1"
```

```bash
curl -X PUT http://localhost:3500/v1.0/metadata/startup-complete \
  -H "Content-Type: text/plain" \
  -d "true"
```

Retrieve custom metadata:

```bash
curl -s http://localhost:3500/v1.0/metadata | jq '.extended'
```

Response:

```json
{
  "app-version": "2.5.1",
  "startup-complete": "true"
}
```

## Using Metadata in Service Mesh Discovery

Populate metadata during app startup for use by sidecar-aware service meshes and dashboards:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function registerAppMetadata() {
  await client.metadata.set("app-version", process.env.APP_VERSION);
  await client.metadata.set("deployment-region", process.env.REGION);
  await client.metadata.set("startup-time", new Date().toISOString());
}

app.listen(3000, async () => {
  await registerAppMetadata();
  console.log("App started and metadata registered");
});
```

## Component Capabilities

The `capabilities` array in the metadata response tells you what features a component supports:

| Capability | Description |
|---|---|
| ETAG | Optimistic concurrency support |
| TRANSACTIONAL | Multi-key transactions |
| QUERY_API | Query/filter operations |
| TTL | Time-to-live support |

## Summary

The Dapr Metadata API is the runtime introspection endpoint for the sidecar. Use it to verify component loading during startup, monitor active actor counts, audit subscriptions, and store custom application metadata. The custom metadata feature is particularly useful for tagging running instances with version and region information for operational visibility.
