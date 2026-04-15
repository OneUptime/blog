# How to Use Azure Event Hubs Checkpointing with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Event Hub, Checkpointing, Pub/Sub, Offset Management, Microservice

Description: Configure Azure Event Hubs checkpointing with Dapr pub/sub to track consumer progress, enable reliable restarts, and manage partition offsets.

---

## Overview

Azure Event Hubs uses a checkpointing mechanism to track how far each consumer has read in each partition. Without checkpointing, a restarted consumer would reprocess all events from the beginning. Dapr's Event Hubs pub/sub component uses Azure Blob Storage for checkpointing, storing offset information so consumers resume from where they left off.

## How Event Hubs Checkpointing Works

Event Hubs organizes messages into partitions. Each consumer group maintains its own offset per partition, stored as a checkpoint blob in Azure Storage. When a Dapr sidecar restarts, it reads the checkpoint blobs to determine the last processed offset and resumes from there.

## Required Azure Resources

```bash
# Create storage account for checkpoints
az storage account create \
  --name daprcheckpoints \
  --resource-group dapr-demo \
  --sku Standard_LRS \
  --kind StorageV2

# Create container for checkpoint blobs
az storage container create \
  --name dapr-eventhubs-checkpoints \
  --account-name daprcheckpoints

# Get storage account key
az storage account keys list \
  --account-name daprcheckpoints \
  --resource-group dapr-demo \
  --query [0].value -o tsv
```

## Dapr Component with Checkpointing

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
      value: "daprcheckpoints"
    - name: storageAccountKey
      secretKeyRef:
        name: storage-secret
        key: accountKey
    - name: storageContainerName
      value: "dapr-eventhubs-checkpoints"
    - name: consumerID
      value: "dapr-order-processor"
```

## Storage Account Key Secret

```bash
kubectl create secret generic storage-secret \
  --from-literal=accountKey="your-storage-account-key"
```

## Default Start Position

When a Dapr sidecar starts and no checkpoint exists for a partition, the Azure Event Hubs SDK defaults to reading from the latest position, meaning only new events are consumed. Existing checkpoints always take priority—the consumer resumes from the last checkpointed offset.

To reprocess events from the beginning, delete the existing checkpoint blobs (see "Resetting Checkpoints" below) and restart the Dapr sidecar.

## Verifying Checkpoints

Check checkpoint blobs in Azure Storage:

```bash
az storage blob list \
  --container-name dapr-eventhubs-checkpoints \
  --account-name daprcheckpoints \
  --query "[].{Name:name, LastModified:properties.lastModified}" \
  -o table
```

Checkpoint blob names follow the pattern:
`{fully-qualified-namespace}/{eventhub}/{consumerGroup}/checkpoint/{partitionId}`

## Checkpoint Blob Contents

```bash
az storage blob metadata show \
  --container-name dapr-eventhubs-checkpoints \
  --name "dapr-eventhubs.servicebus.windows.net/orders/dapr-order-processor/checkpoint/0" \
  --account-name daprcheckpoints \
  -o json
# {"offset":"12345","sequencenumber":"100"}
```

Checkpoint data is stored as blob metadata properties, not as blob content.

## Resetting Checkpoints

To force a consumer to reprocess from the beginning, delete the checkpoint blobs:

```bash
az storage blob delete-batch \
  --source dapr-eventhubs-checkpoints \
  --account-name daprcheckpoints \
  --pattern "dapr-eventhubs.servicebus.windows.net/orders/dapr-order-processor/*"
```

Then restart the Dapr pods to trigger fresh checkpoint creation.

## Using Managed Identity for Storage

Avoid storage account keys by using Managed Identity:

```yaml
metadata:
  - name: storageAccountName
    value: "daprcheckpoints"
  - name: azureClientId
    value: "your-managed-identity-client-id"
```

## Summary

Dapr's Event Hubs checkpointing stores consumer offsets in Azure Blob Storage, enabling reliable restarts without reprocessing events. Configure the storage account name, container, and consumer group name in the component metadata. To replay events after an outage, delete the checkpoint blobs and restart the Dapr sidecar. Use Managed Identity instead of storage account keys in production.
