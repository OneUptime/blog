# How to Configure Azure Event Hubs Partition Count for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Event Hub, Pub/Sub, Partition, Messaging

Description: Configure Azure Event Hubs partition count and consumer group settings in Dapr to achieve parallel processing and scale throughput horizontally.

---

## Overview

Azure Event Hubs partitions are the unit of parallelism - more partitions means more consumers can read in parallel. Dapr's Event Hubs pub/sub component maps each Dapr app instance to one or more partition readers via a checkpoint store.

## Dapr Event Hubs Component Configuration

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
    value: "my-consumer-group"
```

## Creating an Event Hub with Specific Partition Count

```bash
# Create namespace
az eventhubs namespace create \
  --resource-group my-rg \
  --name my-eventhubs-ns \
  --sku Standard \
  --location eastus

# Create event hub with 32 partitions
az eventhubs eventhub create \
  --resource-group my-rg \
  --namespace-name my-eventhubs-ns \
  --name orders \
  --partition-count 32 \
  --message-retention 7

# Create consumer group for Dapr
az eventhubs eventhub consumer-group create \
  --resource-group my-rg \
  --namespace-name my-eventhubs-ns \
  --eventhub-name orders \
  --name dapr-consumers
```

Note: Partition count cannot be changed after creation on standard tier. Plan capacity carefully.

## Scaling Dapr Consumers to Match Partitions

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
spec:
  replicas: 8   # Up to partition-count replicas are useful
  template:
    spec:
      containers:
      - name: app
        image: order-processor:latest
      - name: daprd
        image: daprio/daprd:1.13.0
        args:
        - "--app-id"
        - "order-processor"
        - "--app-port"
        - "3000"
```

## Publishing Events with Partition Keys

Use partition keys to ensure ordered processing for related events:

```bash
curl -X POST "http://localhost:3500/v1.0/publish/eventhubs-pubsub/orders?metadata.partitionKey=customer-123" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "456", "customerId": "123"}'
```

## Monitoring Partition Metrics

```bash
# Get partition runtime info
az eventhubs eventhub show \
  --resource-group my-rg \
  --namespace-name my-eventhubs-ns \
  --name orders \
  --query "partitionCount"

# Check checkpoint progress in Azure Storage
az storage blob list \
  --account-name mystorageaccount \
  --container-name dapr-checkpoints \
  --output table
```

## Partition Count Recommendations

| Daily Events | Recommended Partitions | Max Consumer Pods |
|-------------|------------------------|-------------------|
| < 1 million | 4 | 4 |
| 1-10 million | 8-16 | 8-16 |
| > 10 million | 32 | 32 |

## Summary

Azure Event Hubs partition count determines the maximum parallelism for Dapr consumers. Set partition count at creation time based on expected throughput, create a dedicated consumer group for Dapr, and use partition keys to maintain ordering for related events. Scale Dapr app replicas up to the partition count to maximize parallel processing.
