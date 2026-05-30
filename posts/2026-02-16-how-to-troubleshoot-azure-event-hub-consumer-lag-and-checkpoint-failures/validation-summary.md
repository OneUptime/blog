# Validation Summary: How to Troubleshoot Azure Event Hub Consumer Lag and Checkpoint Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Event Hubs
- Azure Event Hubs Python SDK
- Azure Blob Storage checkpoint store
- Azure CLI
- Application Insights / monitoring metrics

## Sources Consulted
- Azure Event Hubs scalability guide: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-scalability
- Azure Event Hubs Python SDK overview: https://learn.microsoft.com/en-us/python/api/overview/azure/eventhub-readme
- Azure Event Hubs aio EventHubConsumerClient API: https://learn.microsoft.com/en-us/python/api/azure-eventhub/azure.eventhub.aio.eventhubconsumerclient
- Azure Event Hubs aio PartitionContext API: https://learn.microsoft.com/en-us/python/api/azure-eventhub/azure.eventhub.aio.partitioncontext
- Azure EventHubs Checkpoint Store using Storage Blobs Python library: https://learn.microsoft.com/en-us/python/api/overview/azure/eventhub-checkpointstoreblob-aio-readme
- Azure CLI Event Hubs eventhub command reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub
- Azure CLI Event Hubs consumer-group command reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub/consumer-group
- Azure CLI Event Hubs namespace command reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace
- Azure Event Hubs messaging exceptions: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-messaging-exceptions

## Issues Found
- The post said the `az eventhubs eventhub show --query "partitionIds"` command checks the last enqueued sequence number for each partition. The command is valid, but it returns partition IDs from the management-plane Event Hub description, not runtime last-enqueued sequence numbers. I changed the text and comments to say it lists partition IDs and noted that last-enqueued tracking is exposed by the SDK.
- The Python Event Hubs example passed a batch-style callback to `client.receive(on_event=process_events)`. In the current Python SDK, `receive()` expects a single-event callback, while `receive_batch()` expects `on_event_batch(partition_context, event_batch)`. I changed the example to call `receive_batch(on_event_batch=process_events)`.
- The checkpoint store connectivity section implied managed identity alone could satisfy storage firewall access. I clarified that storage firewall/network access and credentials or permissions are separate requirements.

## Review Notes
The Azure CLI command names and options shown in the post are current according to the Azure CLI reference. The throughput unit limits, auto-inflate guidance, checkpoint update pattern, partition callbacks, and consumer group guidance are consistent with current Microsoft documentation. The local environment did not have `az` installed, so CLI verification was done against official Microsoft Learn command references rather than local `az --help` output.
