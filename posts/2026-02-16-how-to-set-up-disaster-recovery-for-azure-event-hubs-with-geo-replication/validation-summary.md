# Validation Summary: How to Set Up Disaster Recovery for Azure Event Hubs with Geo-Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Event Hubs
- Azure Event Hubs Geo-Disaster Recovery
- Azure Event Hubs Geo-replication
- Azure CLI
- Azure Monitor / Log Analytics
- Python Azure Event Hubs SDK

## Sources Consulted
- Azure Event Hubs geo-disaster recovery: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-geo-dr
- Configure geo-disaster recovery for Azure Event Hubs: https://learn.microsoft.com/en-us/azure/event-hubs/configure-geo-disaster-recovery
- Azure Event Hubs geo-replication: https://learn.microsoft.com/en-us/azure/event-hubs/geo-replication
- How to use Azure Event Hubs geo-replication: https://learn.microsoft.com/en-us/azure/event-hubs/use-geo-replication
- Reliability in Azure Event Hubs: https://learn.microsoft.com/en-us/azure/reliability/reliability-event-hubs
- Azure CLI `az eventhubs georecovery-alias`: https://learn.microsoft.com/en-us/cli/azure/eventhubs/georecovery-alias
- Azure CLI `az eventhubs namespace replica`: https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace/replica
- Azure CLI `az eventhubs eventhub`: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub
- Azure CLI `az eventhubs eventhub consumer-group`: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub/consumer-group
- Azure Event Hubs client library for Python: https://learn.microsoft.com/en-us/python/api/overview/azure/eventhub-readme

## Issues Found
- The description implied automatic failover. Azure Event Hubs Geo-DR and geo-replication require customer-initiated failover or promotion, so the description and Python comment were changed to refer to manual failover.
- The Geo-DR explanation said the secondary takes over the primary connection string. The accurate behavior is that the Geo-DR alias is repointed to the secondary namespace, so that wording was corrected.
- The prerequisites incorrectly required all namespace pairs to be the same tier. Geo-DR supports Standard-Standard, Standard-Dedicated, Premium-Premium, and Dedicated-Dedicated; geo-replication requires Premium or Dedicated on the same tier. The prerequisite bullets were corrected.
- The Event Hub creation commands used `--message-retention`, which is not the current Azure CLI parameter. The commands now use `--retention-time-in-hours 168`.
- The geo-replication CLI example used `--location`, which is not the required shape for `az eventhubs namespace replica add`. It was changed to use `--geo-data-replication-config role-type=Secondary location-name=westus2` and a maximum replication lag setting.
- The post said geo-replication failover preserves in-flight events and that consumers can read from the closest replica. Azure documents planned promotion, forced promotion with possible data loss, and no direct read/write access to secondary regions. Those bullets were corrected.
- The monitoring example used the deprecated/irrelevant `EHAMSGS` metric for replication lag. It was replaced with the official Application Metrics Logs query for `ReplicationLag`.
- The summary claimed Premium geo-replication provides zero data loss. This was changed to describe synchronous/asynchronous consistency without making an unconditional zero-data-loss claim.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was performed against current Microsoft Learn command reference pages rather than local `az --help` output.
