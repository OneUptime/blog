# Validation Summary: How to Build a Real-Time Trading Data Platform with Azure Event Hubs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Event Hubs
- Azure Event Hubs Capture
- Azure Cosmos DB for NoSQL
- Azure Functions Event Hubs trigger
- Azure CLI
- Azure Monitor metric alerts
- Python
- Azure SDK for Python

## Sources Consulted
- Azure Event Hubs CLI reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub?view=azure-cli-latest
- Azure Event Hubs namespace CLI reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace?view=azure-cli-latest
- Azure Cosmos DB CLI reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb?view=azure-cli-latest
- Azure Cosmos DB SQL container CLI reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container?view=azure-cli-latest
- Azure Event Hubs Capture overview: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-capture-overview
- Azure Event Hubs trigger for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-hubs-trigger
- Azure Event Hubs Python producer client reference: https://learn.microsoft.com/en-us/python/api/azure-eventhub/azure.eventhub.aio.eventhubproducerclient
- Azure Cosmos DB autoscale throughput documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/provision-throughput-autoscale
- Azure Monitor metric alerts CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest

## Issues Found
- The Event Hubs creation command used `--message-retention 7`, which is not the current documented Azure CLI option. Changed it to `--retention-time-in-hours 168` to retain events for seven days.
- The Cosmos DB guidance recommended multi-region writes, but the account creation command only configured one region and did not enable multiple write locations. Added a second region and `--enable-multiple-write-locations true`.
- The Cosmos DB database command comment said "shared throughput" even though throughput was configured on the container, not the database. Updated the comment to say "Create a database."
- The Azure Functions Python sample used a single `func.EventHubEvent` type annotation while the `function.json` uses `cardinality: "many"`. Updated the annotation to `list[func.EventHubEvent]`.
- The Azure Functions Python sample imported `PartitionKey` without using it. Removed the unused import.
- The Azure Functions Python sample used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with `datetime.now(timezone.utc)`.
- The Event Hubs Capture update command used `--capture-enabled` and `--capture-encoding`, but the current documented Azure CLI flags are `--enable-capture` and `--encoding`. Updated both flags.
- The Cosmos DB query section claimed an under-5-ms response time. Microsoft documents single-digit millisecond response times, so the claim was adjusted to match the documented guarantee.
- The Event Hubs tuning section advised increasing partition count when consumers fall behind. Because the design relies on partition keys for per-symbol ordering, the guidance was changed to prefer scaling consumers and to treat partition count changes as a pre-production design decision.
- The monitoring section said data would be lost as soon as incoming messages exceed capacity. Updated it to describe publisher throttling/rejection and the need for retries and back pressure.

## Review Notes
The post is technically valid after the corrections. The examples still use connection strings and account keys for brevity, while the post already notes that managed identity should be used in production.
