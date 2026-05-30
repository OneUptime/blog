# Validation Summary: How to Set Up Event Routes from Azure Digital Twins to Azure Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Digital Twins
- Azure Event Grid
- Azure Functions
- Azure CLI
- Azure Monitor
- Python
- Azure Identity
- Azure Digital Twins Python SDK

## Sources Consulted
- Microsoft Learn: Azure Digital Twins create routes and filters - https://learn.microsoft.com/en-us/azure/digital-twins/how-to-create-routes
- Microsoft Learn: Azure Digital Twins event notifications - https://learn.microsoft.com/en-us/azure/digital-twins/concepts-event-notifications
- Microsoft Learn: Azure Digital Twins endpoints and event routes - https://learn.microsoft.com/en-us/azure/digital-twins/concepts-route-events
- Microsoft Learn CLI reference: az dt endpoint create - https://learn.microsoft.com/en-us/cli/azure/dt/endpoint/create
- Microsoft Learn CLI reference: az dt route - https://learn.microsoft.com/en-us/cli/azure/dt/route
- Microsoft Learn CLI reference: az eventgrid event-subscription - https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Microsoft Learn: Azure Functions Event Grid trigger - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid-trigger
- Microsoft Learn CLI reference: az functionapp - https://learn.microsoft.com/en-us/cli/azure/functionapp
- Microsoft Learn: Azure Digital Twins monitoring metrics - https://learn.microsoft.com/en-us/azure/digital-twins/how-to-monitor
- Microsoft Learn: Supported Azure Monitor metrics for Microsoft.DigitalTwins/digitalTwinsInstances - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-digitaltwins-digitaltwinsinstances-metrics

## Issues Found
- Corrected the Event Grid endpoint authentication guidance. Azure Digital Twins Event Grid endpoints do not support identity-based endpoint integration, so the post should not assign the Azure Digital Twins managed identity the Event Grid Data Sender role for this endpoint type.
- Corrected the telemetry event type from `Microsoft.DigitalTwins.Telemetry` to `microsoft.iot.telemetry`, which is the documented Azure Digital Twins telemetry event type used in route filters and Event Grid payloads.
- Added `Microsoft.DigitalTwins.Relationship.Update` to the relationship event description and route filter, because Azure Digital Twins relationship change notifications include create, update, and delete events.
- Updated the Azure Function sample to pass `event.subject` as the twin ID for update handling. The Event Grid schema body for a twin update contains `modelId` and `patch`, not `$dtId`.
- Added Function App managed identity and `Azure Digital Twins Data Owner` role assignment commands so `DefaultAzureCredential` can authenticate the deployed function when it queries and updates twins.
- Added a storage account creation command and variable for the Function App, since `az functionapp create` requires an existing storage account.
- Corrected the Event Grid payload examples to show Azure Digital Twins' nested `data.data` structure for Event Grid schema events.
- Corrected the route-level model filter for twin update events from `$body.$metadata.$model` to `$body.modelId`, matching the documented notification body field for update events.
- Corrected the Azure Monitor metric from `RoutingDeliveries` to `RoutingFailureRate`, which is a supported Azure Digital Twins routing metric. `RoutingDeliveries` is an IoT Hub metric, not an Azure Digital Twins metric.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI checks were performed against official Microsoft Learn CLI references rather than local `az --help` output.
