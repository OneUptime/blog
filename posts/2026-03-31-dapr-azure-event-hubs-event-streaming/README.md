# How to Configure Azure Event Hubs for Event Streaming with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Event Hub, Pub/Sub, Event Streaming, Kubernetes

Description: Learn how to configure Azure Event Hubs as a Dapr pub/sub component for scalable event streaming in cloud-native applications.

---

## Overview

Azure Event Hubs is a fully managed, real-time data ingestion service that can handle millions of events per second. Combined with Dapr's pub/sub building block, it provides a powerful foundation for event-driven microservices without vendor lock-in.

## Prerequisites

- Dapr CLI installed and initialized
- An Azure subscription with Event Hubs namespace
- kubectl configured for your Kubernetes cluster

## Creating an Azure Event Hubs Namespace

First, create the Event Hubs namespace and an event hub using the Azure CLI:

```bash
az group create --name myResourceGroup --location eastus

az eventhubs namespace create \
  --name myehnamespace \
  --resource-group myResourceGroup \
  --sku Standard

az eventhubs eventhub create \
  --name orders \
  --namespace-name myehnamespace \
  --resource-group myResourceGroup \
  --partition-count 4

az eventhubs eventhub consumer-group create \
  --name order-processor \
  --eventhub-name orders \
  --namespace-name myehnamespace \
  --resource-group myResourceGroup
```

Retrieve the connection string:

```bash
az eventhubs namespace authorization-rule keys list \
  --name RootManageSharedAccessKey \
  --namespace-name myehnamespace \
  --resource-group myResourceGroup \
  --query primaryConnectionString -o tsv
```

## Dapr Component Configuration

Create a Kubernetes secret for the connection string:

```bash
kubectl create secret generic eventhubs-secret \
  --from-literal=connectionString="Endpoint=sb://myehnamespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=<KEY>"
```

Define the Dapr pub/sub component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: eventhubs-pubsub
  namespace: default
spec:
  type: pubsub.azure.eventhubs
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: eventhubs-secret
      key: connectionString
  - name: storageAccountName
    value: "mystorageaccount"
  - name: storageAccountKey
    secretKeyRef:
      name: storage-secret
      key: accountKey
  - name: storageContainerName
    value: "dapr-checkpoints"
  - name: consumerID
    value: "order-processor"
```

## Publishing and Subscribing

Publish an event from a microservice:

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

async function publishOrder(order) {
  await client.pubsub.publish('eventhubs-pubsub', 'orders', {
    orderId: order.id,
    customerId: order.customerId,
    amount: order.amount,
    timestamp: new Date().toISOString()
  });
  console.log(`Published order ${order.id}`);
}
```

Subscribe to events using a declarative subscription:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: eventhubs-pubsub
  topic: orders
  routes:
    default: /orders/process
```

Handle the event in your service:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/orders/process', (req, res) => {
  const event = req.body;
  console.log(`Processing order: ${event.data.orderId}`);
  // Business logic here
  res.status(200).json({ status: 'SUCCESS' });
});
```

## Checkpoint Storage Configuration

Event Hubs requires Azure Blob Storage for checkpointing consumer group offsets. Create the storage account:

```bash
az storage account create \
  --name mystorageaccount \
  --resource-group myResourceGroup \
  --sku Standard_LRS

az storage container create \
  --name dapr-checkpoints \
  --account-name mystorageaccount
```

## Summary

Azure Event Hubs integrates seamlessly with Dapr's pub/sub API, enabling high-throughput event streaming in microservices. The combination of Event Hubs partitioning with Dapr's consumer group support allows horizontal scaling of event processors. Checkpoint storage via Azure Blob ensures reliable offset management across restarts.
