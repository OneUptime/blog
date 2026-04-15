# Validation Summary: How to Use Azure Event Hubs Checkpointing with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub component)
- Azure Event Hubs
- Azure Blob Storage (checkpoint store)
- Azure CLI
- Kubernetes (secrets)
- Azure Managed Identity

## Sources Consulted
- Dapr Azure Event Hubs pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-eventhubs/
- Dapr components-contrib source code (pubsub/azure/eventhubs): https://github.com/dapr/components-contrib/tree/master/pubsub/azure/eventhubs
- Dapr components-contrib common Event Hubs implementation: https://github.com/dapr/components-contrib/blob/master/common/component/azure/eventhubs/metadata.go
- Azure SDK for Go checkpoint blob store implementation: https://github.com/Azure/azure-sdk-for-go/blob/main/sdk/messaging/azeventhubs/checkpoints/blob_store.go
- Azure Event Hubs features and terminology: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-features

## Issues Found

### 1. `initialOffsetPolicy` is not a valid Dapr metadata field
**What was wrong:** The post included `initialOffsetPolicy` as a metadata field in the Dapr component YAML and had an entire section ("Understanding initialOffsetPolicy") describing `latest` and `earliest` values. This field does not exist in the Dapr Azure Event Hubs pub/sub component — it is not in the official documentation, the metadata YAML definition, or the source code.
**What was changed:** Removed `initialOffsetPolicy` from the component YAML. Replaced the "Understanding initialOffsetPolicy" section with a "Default Start Position" section that correctly explains the actual behavior: when no checkpoint exists, the Azure Event Hubs SDK defaults to reading from the latest position. Updated the Summary section to remove the `initialOffsetPolicy` reference.

### 2. Checkpoint blob naming pattern was incorrect
**What was wrong:** The post stated the pattern was `{namespace}/{eventhub}/{consumerGroup}/{partitionId}`. The actual Azure SDK checkpoint blob path includes a `/checkpoint/` segment and uses the fully-qualified namespace.
**What was changed:** Corrected to `{fully-qualified-namespace}/{eventhub}/{consumerGroup}/checkpoint/{partitionId}`.

### 3. Checkpoint data format was incorrect
**What was wrong:** The post showed downloading a checkpoint blob as JSON content (`{"Offset":"12345","SequenceNumber":100,"PartitionID":"0","ConsumerGroupName":"dapr-order-processor"}`). In reality, the Azure SDK stores checkpoint data as **blob metadata properties** (key-value pairs on the blob), not as JSON in the blob body. The actual metadata keys are lowercase `offset` and `sequencenumber`.
**What was changed:** Replaced `az storage blob download` with `az storage blob metadata show` command. Updated the example output to `{"offset":"12345","sequencenumber":"100"}`. Added a note clarifying that checkpoint data is stored as blob metadata properties.

### 4. Blob paths in examples used incorrect format
**What was wrong:** The blob name in the download example (`dapr-eventhubs/orders/dapr-order-processor/0`) and the delete pattern (`dapr-eventhubs/orders/dapr-order-processor/*`) used a short namespace name instead of the fully-qualified namespace, and omitted the `/checkpoint/` path segment.
**What was changed:** Updated to use `dapr-eventhubs.servicebus.windows.net/orders/dapr-order-processor/checkpoint/0` and `dapr-eventhubs.servicebus.windows.net/orders/dapr-order-processor/*` respectively.

## Review Notes
- The Dapr Kafka pub/sub component does have an `initialOffset` field (with values `oldest`/`newest`), which may have been the source of confusion with the non-existent `initialOffsetPolicy` field on the Event Hubs component.
- The `checkPointFrequencyPerPartition` metadata field (documented in Dapr) controls how often checkpoints are written. The post doesn't mention it, which is fine for a focused checkpointing overview but could be useful for readers tuning performance.
- Azure CLI commands for storage account creation, container creation, key listing, blob listing, and blob deletion are syntactically correct.
- The Dapr component YAML structure (apiVersion, kind, spec, metadata fields) is correct.
- The Managed Identity section correctly shows using `azureClientId` for user-assigned managed identity, which is consistent with the Dapr documentation's Azure authentication fields.
