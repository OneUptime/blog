# How to Configure Dapr with RethinkDB State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RethinkDB, State Store, Microservice, Real-Time

Description: Learn how to configure Dapr with RethinkDB as a state store, leveraging RethinkDB's real-time change feed capabilities for reactive microservice architectures.

---

## Overview

RethinkDB is a distributed, document-oriented database with a unique feature: push-based real-time feeds that notify applications when data changes. As a Dapr state store, RethinkDB is ideal for microservices that need persistent state with built-in reactivity, such as live dashboards, collaborative applications, or event-driven workflows.

## Prerequisites

- A running RethinkDB cluster (version 2.4 or later)
- Dapr CLI and runtime installed
- kubectl for Kubernetes deployments

## Setting Up RethinkDB

Run RethinkDB using Docker:

```bash
docker run -d \
  --name rethinkdb \
  -p 8080:8080 \
  -p 28015:28015 \
  -p 29015:29015 \
  rethinkdb:2.4.3
```

Access the RethinkDB admin UI at http://localhost:8080 to verify the instance is running. The Dapr state store will automatically create the required tables.

## Configuring the Dapr Component

Create the component YAML:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rethinkdb-statestore
  namespace: default
spec:
  type: state.rethinkdb
  version: v1
  metadata:
  - name: address
    value: "localhost:28015"
  - name: database
    value: "dapr"
  - name: username
    value: "admin"
  - name: password
    secretKeyRef:
      name: rethinkdb-secret
      key: password
  - name: archive
    value: "false"
```

The `archive` option, when set to `true`, writes all state changes to an archive table, enabling audit trails and event replay.

Create the secret and apply the component:

```bash
kubectl create secret generic rethinkdb-secret \
  --from-literal=password=yourpassword

kubectl apply -f rethinkdb-statestore.yaml
```

## Storing and Reading State

Use the Dapr HTTP API to manage state:

```bash
# Save IoT device telemetry state
curl -X POST http://localhost:3500/v1.0/state/rethinkdb-statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "device-sensor-007",
    "value": {
      "temperature": 22.5,
      "humidity": 61,
      "battery": 87,
      "timestamp": "2026-03-31T10:00:00Z"
    }
  }]'

# Retrieve state
curl http://localhost:3500/v1.0/state/rethinkdb-statestore/device-sensor-007
```

## Using with the JavaScript SDK

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

async function updateDeviceState(deviceId, telemetry) {
  await client.state.save("rethinkdb-statestore", [
    { key: `device-${deviceId}`, value: telemetry }
  ]);
  console.log(`Updated state for device ${deviceId}`);
}

async function getDeviceState(deviceId) {
  return await client.state.get("rethinkdb-statestore", `device-${deviceId}`);
}
```

## Verifying Data in RethinkDB

Use the RethinkDB admin UI or ReQL to query stored data:

```javascript
// ReQL query to inspect Dapr state
r.db("dapr").table("daprstate").limit(10).run(conn);
```

## Summary

RethinkDB as a Dapr state store combines persistent document storage with real-time change feeds, making it well-suited for reactive microservice architectures. The optional change archiving feature provides a built-in audit log of all state mutations, which is valuable for compliance and debugging.
