# Validation Summary: How to Configure Partitions and Throughput Units in Azure Event Hubs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Event Hubs
- Azure Event Hubs partitions
- Azure Event Hubs throughput units, processing units, and capacity units
- Azure CLI
- Azure Monitor metrics alerts
- Azure Event Hubs Python SDK

## Sources Consulted
- Microsoft Learn: Scaling with Event Hubs, https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-scalability
- Microsoft Learn: Dynamically add partitions to an event hub, https://learn.microsoft.com/en-us/azure/event-hubs/dynamically-add-partitions
- Microsoft Learn: Compare Azure Event Hubs tiers, https://learn.microsoft.com/en-us/azure/event-hubs/compare-tiers
- Microsoft Learn: Automatically scale up Azure Event Hubs throughput units, https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-auto-inflate
- Microsoft Learn: Azure CLI az eventhubs namespace, https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace
- Microsoft Learn: Azure CLI az eventhubs eventhub, https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub
- Microsoft Learn: Quickstart: Send events to or receive events from event hubs by using Python, https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-python-get-started-send
- Microsoft Learn: Azure Event Hubs monitoring data reference, https://learn.microsoft.com/en-us/azure/event-hubs/monitor-event-hubs-reference

## Issues Found
- The Event Hub creation command used `--message-retention 7`, which is not the current Azure CLI option. Changed it to `--retention-time 168` because current CLI documentation expresses Event Hub retention in hours via `--retention-time` / `--retention-time-in-hours`.
- The Premium tier partition limit was listed as 1024 partitions per Event Hub. Current Microsoft tier limits list Premium as 100 partitions per Event Hub, subject to a namespace-level limit of 200 partitions per PU; 1024 partitions per Event Hub applies to Dedicated. Updated the Premium paragraph accordingly.
- The simplified TU sizing formula only mentioned ingress MB/s. Updated it to account for ingress event rate, ingress bytes, egress event rate, and egress bytes, matching the documented per-TU limits.

## Review Notes
- The Python producer example uses the current `azure-eventhub` SDK pattern with `EventHubProducerClient.from_connection_string`, `create_batch(partition_key=...)`, `EventData`, and `send_batch`.
- The Auto-Inflate behavior described in the post matches Microsoft documentation: it scales up in Standard tier and does not automatically scale down.
- Azure CLI was not installed locally in this environment, so CLI validation was performed against current Microsoft Learn Azure CLI reference documentation.
