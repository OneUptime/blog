# Validation Summary: How to Configure Azure Event Hubs Partition Count for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub component for Azure Event Hubs)
- Azure Event Hubs (partitions, consumer groups, checkpoint store)
- Azure CLI (`az eventhubs`, `az storage`)
- Kubernetes Deployments (scaling consumers)
- Dapr HTTP Publish API

## Sources Consulted
- Dapr Azure Event Hubs pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-eventhubs/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr runtime source (`dapr/dapr` on GitHub) — `pkg/api/http/http.go` `getMetadataFromRequest` function confirms metadata is extracted from query parameters only
- Dapr Event Hubs component source (`dapr/components-contrib`) — `pubsub/azure/eventhubs/eventhubs.go` confirms `partitionKey` metadata field
- Azure Event Hubs scalability guide: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-scalability
- Azure Event Hubs features and terminology: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-features
- Azure Event Hubs quotas and limits: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-quotas
- Azure CLI `az eventhubs` command reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs

## Issues Found
1. **Incorrect partition key passing mechanism in publish curl command**: The post used `-H "dapr-partition-key: customer-123"` as an HTTP header to specify the partition key when publishing. This is not a valid mechanism in Dapr's publish API. Dapr extracts publish metadata exclusively from URL query parameters prefixed with `metadata.`, not from HTTP headers. The correct approach is to pass the partition key as a query parameter: `?metadata.partitionKey=customer-123`. Fixed the curl command accordingly.

## Review Notes
- The Kubernetes Deployment YAML is simplified for illustration (missing `spec.selector.matchLabels` and pod template `metadata.labels`, which are required fields). This is acceptable for a blog post focused on the Dapr/partitioning concept, but readers copying the YAML verbatim will get validation errors.
- The manual daprd sidecar container pattern shown in the Deployment is valid but unconventional. Most production Dapr-on-Kubernetes setups use the Dapr sidecar injector with pod annotations (`dapr.io/enabled: "true"`, `dapr.io/app-id`, `dapr.io/app-port`). The approach shown still works but readers should be aware of the annotation-based alternative.
- The partition count immutability note is correct for Standard tier. On Premium and Dedicated tiers, partitions can be increased (but never decreased) after creation.
- The `daprio/daprd:1.13.0` image version is dated; current Dapr versions are higher. This is not incorrect per se but readers should use the latest stable version.
