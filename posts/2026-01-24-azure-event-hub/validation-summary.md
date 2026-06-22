# Validation Summary: How to Handle Azure Event Hub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Event Hubs
- Azure CLI
- Python Azure Event Hubs SDK
- Azure Blob Storage checkpoint store for Python
- Node.js Azure Event Hubs SDK
- Azure Blob Storage checkpoint store for JavaScript
- Apache Kafka protocol for Azure Event Hubs
- Azure Monitor diagnostic settings and metrics

## Sources Consulted
- Azure Event Hubs quotas and limits: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-quotas
- Azure Event Hubs Python client library: https://learn.microsoft.com/en-us/python/api/overview/azure/eventhub-readme?view=azure-python
- Python Blob checkpoint store API: https://learn.microsoft.com/en-us/python/api/azure-eventhub-checkpointstoreblob-aio/azure.eventhub.extensions.checkpointstoreblobaio.blobcheckpointstore?view=azure-python
- Azure Event Hubs JavaScript client library: https://learn.microsoft.com/en-us/javascript/api/overview/azure/event-hubs-readme?view=azure-node-latest
- Azure CLI Event Hubs namespace reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace?view=azure-cli-latest
- Azure CLI Event Hub reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub?view=azure-cli-latest
- Azure CLI Event Hub authorization rule reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub/authorization-rule?view=azure-cli-latest
- Azure Monitor diagnostic settings CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings?view=azure-cli-latest
- Apache Kafka protocol support in Azure Event Hubs: https://learn.microsoft.com/en-us/azure/event-hubs/azure-event-hubs-apache-kafka-overview

## Issues Found
- The Event Hub creation command used `--message-retention 7`, which is not present in the current Azure CLI reference for `az eventhubs eventhub create`. Changed it to `--retention-time 168`, the current retention-time-in-hours option for seven days.
- The Python producer used `datetime.utcnow()`, which is deprecated in current Python versions. Changed it to `datetime.now(timezone.utc)` and imported `timezone`.
- The Python consumer imported `azure.eventhub.extensions.checkpointstoresblobaio`, but the official async Blob checkpoint store module is `azure.eventhub.extensions.checkpointstoreblobaio`. Corrected the import.
- The Node.js producer declared `batch` with `const` and then reassigned it when a batch filled. Changed it to `let batch` so the example can run.
- The Node.js consumer checkpointed `events[events.length - 1]` without checking for an empty event array. Added an `events.length > 0` guard, matching the Azure SDK guidance.
- The async Python retry example imported a non-current `ServiceBusyError` from `azure.core.exceptions` and used blocking `time.sleep()` inside an async function. Changed it to catch `EventHubError` from `azure.eventhub.exceptions` and use `await asyncio.sleep()`.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI verification was performed against the current Microsoft Learn Azure CLI reference instead of local `az --help`. The article still uses SAS connection strings in examples even though it says managed identity is recommended; that is technically valid for tutorial simplicity, but production code should prefer Microsoft Entra ID and Azure RBAC where possible.
