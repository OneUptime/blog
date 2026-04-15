# How to Use Dapr Bindings with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Node.js, Integration, Event-Driven

Description: Learn how to use Dapr input and output bindings in Node.js to connect your microservices to external systems like Kafka, cron, and storage.

---

## Introduction

Dapr Bindings connect your Node.js microservices to external services and systems without custom integration code. Input bindings trigger your app when an external event occurs, while output bindings let your app interact with external resources by calling a simple API.

## Installing the SDK

```bash
npm install @dapr/dapr
```

## Configuring a Cron Input Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cron-trigger
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "@every 30s"
```

## Configuring a Kafka Input Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-input
spec:
  type: bindings.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: topics
      value: "orders"
    - name: consumerGroup
      value: "order-processor"
    - name: authType
      value: "none"
```

## Receiving Input Binding Triggers

Use `DaprServer` to handle input binding events:

```javascript
const { DaprServer } = require("@dapr/dapr");

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "3001",
  clientOptions: { daprHost: "127.0.0.1", daprPort: "3501" },
});

// Handle cron trigger
await server.binding.receive("cron-trigger", async (data) => {
  console.log("Cron job triggered:", new Date().toISOString());
  await cleanupOldRecords();
});

// Handle Kafka messages
await server.binding.receive("kafka-input", async (data) => {
  console.log("Kafka message received:", data);
  await processMessage(JSON.parse(data));
});

await server.start();
```

## Configuring an Output Binding (Azure Storage)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-blob
spec:
  type: bindings.azure.blobstorage
  version: v1
  metadata:
    - name: accountName
      value: "mystorageaccount"
    - name: accountKey
      secretKeyRef:
        name: azure-secret
        key: storage-key
    - name: containerName
      value: "reports"
```

## Invoking Output Bindings

Use `DaprClient` to invoke output bindings:

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient({ daprHost: "127.0.0.1", daprPort: "3500" });

// Write a file to Azure Blob Storage
await client.binding.send("azure-blob", "create", "Report content here", {
  blobName: "report-2026-03-31.txt",
});

console.log("File uploaded to blob storage");
```

## Sending to Kafka Output Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-output
spec:
  type: bindings.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: topics
      value: "processed-orders"
    - name: publishTopic
      value: "processed-orders"
    - name: authType
      value: "none"
```

```javascript
await client.binding.send("kafka-output", "create", {
  orderId: "order-123",
  status: "processed",
});
```

## Summary

Dapr Bindings in Node.js provide a clean abstraction for integrating with external systems. Input bindings trigger your handlers when events arrive from cron, Kafka, or other sources, while output bindings let you write data to storage, queues, or external APIs through a uniform `client.binding.send()` call.
