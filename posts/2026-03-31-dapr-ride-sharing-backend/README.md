# How to Build a Ride-Sharing Backend with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Microservice, Ride-Sharing, State Management, Pub/Sub

Description: Learn how to build a scalable ride-sharing backend using Dapr's building blocks for state, pub/sub, and service invocation.

---

## Overview

A ride-sharing platform requires real-time coordination between drivers, riders, and dispatch services. Dapr simplifies this with portable building blocks that handle state management, messaging, and service-to-service communication without vendor lock-in.

## Architecture

The core services in this system are:

- **Rider Service** - handles ride requests
- **Driver Service** - tracks driver availability and location
- **Matching Service** - pairs riders with nearby drivers
- **Notification Service** - sends trip status updates

## Setting Up the Services

Start all services with Dapr sidecars using a multi-app run file:

```yaml
# dapr.yaml
version: 1
apps:
  - appID: rider-service
    appDirPath: ./rider-service
    appPort: 3001
    command: ["node", "index.js"]
  - appID: driver-service
    appDirPath: ./driver-service
    appPort: 3002
    command: ["node", "index.js"]
  - appID: matching-service
    appDirPath: ./matching-service
    appPort: 3003
    command: ["node", "index.js"]
```

```bash
dapr run -f dapr.yaml
```

## Storing Driver Location State

Driver locations are stored using Dapr's state management API. Each driver's position is saved as a key-value entry:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function updateDriverLocation(driverId, lat, lng) {
  await client.state.save("statestore", [
    {
      key: `driver-location-${driverId}`,
      value: { lat, lng, timestamp: Date.now(), available: true }
    }
  ]);
}
```

## Publishing Ride Requests

When a rider requests a trip, the rider service publishes an event to the `ride-requests` topic:

```javascript
async function requestRide(riderId, pickupLat, pickupLng) {
  await client.pubsub.publish("pubsub", "ride-requests", {
    riderId,
    pickup: { lat: pickupLat, lng: pickupLng },
    requestedAt: new Date().toISOString()
  });
}
```

## Matching Service Subscription

The matching service subscribes to ride requests and finds the nearest available driver:

```javascript
const { DaprServer } = require("@dapr/dapr");
const server = new DaprServer({ serverPort: "3003" });

server.pubsub.subscribe("pubsub", "ride-requests", async (data) => {
  const drivers = await getNearbyDrivers(data.pickup);
  if (drivers.length > 0) {
    const bestDriver = drivers[0];
    await assignRide(bestDriver.id, data.riderId);
  }
});
```

## Service Invocation for Trip Assignment

When a match is made, the matching service invokes the driver service directly:

```javascript
const { DaprClient, HttpMethod } = require("@dapr/dapr");
const client = new DaprClient();

async function assignRide(driverId, riderId) {
  await client.invoker.invoke(
    "driver-service",
    "assign-trip",
    HttpMethod.POST,
    { driverId, riderId, status: "assigned" }
  );
}
```

## Configuring the State Store

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
    - name: redisPassword
      value: ""
```

## Summary

Building a ride-sharing backend with Dapr involves combining state management for driver locations, pub/sub messaging for ride requests, and service invocation for real-time coordination. Dapr's sidecar model lets each service remain lightweight while gaining distributed system capabilities. This approach is portable across cloud providers and local development environments alike.
