# Validation Summary: How to Configure Flux Notification Provider for Azure Event Hub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes Secrets
- Azure Event Hubs
- Azure CLI
- Azure Monitor metrics

## Sources Consulted
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1 and v1beta3: https://fluxcd.io/flux/components/notification/api/v1/ and https://fluxcd.io/flux/components/notification/api/v1beta3/
- Azure CLI `az eventhubs eventhub` reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub?view=azure-cli-latest
- Azure CLI `az eventhubs namespace` reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace?view=azure-cli-latest
- Azure CLI `az eventhubs namespace authorization-rule` reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace/authorization-rule?view=azure-cli-latest
- Azure Event Hubs monitoring data reference: https://learn.microsoft.com/en-us/azure/event-hubs/monitor-event-hubs-reference

## Issues Found
- The Provider and Alert examples used `notification.toolkit.fluxcd.io/v1`. Current Flux documentation exposes Provider and Alert examples under `notification.toolkit.fluxcd.io/v1beta3`, while the v1 API reference only documents Receiver. Updated both manifests to `v1beta3`.
- The Azure Event Hub Provider used `spec.channel` as the Event Hub name while using SAS authentication. Flux documentation states that SAS-based Azure Event Hub auth uses the secret `address` field. Updated the provider to rely on `secretRef` and changed the secret connection string to include `EntityPath=flux-events`.
- The Azure CLI Event Hub creation example used `--message-retention 1`, but the current Azure CLI reference documents `--retention-time` / `--retention-time-in-hours` in hours. Updated the example to `--retention-time 24`.
- The verification command claimed to check metrics but queried the Event Hub retention property. Replaced it with an Azure Monitor metrics command for the `IncomingMessages` metric filtered by Event Hub entity name.
- The troubleshooting section said the Provider `channel` field must match the Event Hub name. Updated it to say the connection string `EntityPath` must match the Event Hub name for this SAS-based configuration.

## Review Notes
The post remains focused on SAS-based authentication. Flux also supports Azure Workload Identity for Azure Event Hub, where `spec.channel` is the namespace and `spec.address` is the Event Hub name, but adding that path would be an enhancement rather than a correctness fix for this guide.
