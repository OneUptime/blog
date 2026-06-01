# Validation Summary: How to Connect Azure Event Grid to Azure Functions as Event Handler

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Event Grid
- Azure Functions
- .NET isolated worker
- Python Azure Functions programming model
- Node.js / TypeScript Azure Functions programming model
- Azure CLI
- Bicep / ARM templates
- Application Insights

## Sources Consulted
- Azure Event Grid trigger for Azure Functions: https://learn.microsoft.com/azure/azure-functions/functions-bindings-event-grid-trigger
- Use a function as an event handler for Event Grid events: https://learn.microsoft.com/azure/event-grid/handler-functions
- Azure Event Grid message delivery and retry: https://learn.microsoft.com/azure/event-grid/delivery-and-retry
- Azure CLI `az eventgrid event-subscription` reference: https://learn.microsoft.com/cli/azure/eventgrid/event-subscription
- Azure Functions hosting options: https://learn.microsoft.com/azure/azure-functions/functions-scale
- Azure Functions error handling and retries: https://learn.microsoft.com/azure/azure-functions/functions-bindings-error-pages
- Event Grid event subscription ARM/Bicep reference: https://learn.microsoft.com/azure/templates/microsoft.eventgrid/topics/eventsubscriptions

## Issues Found
- The batch delivery section said Event Grid triggers currently receive one event at a time and directed readers to handle batches with an HTTP trigger. Current Azure Functions Event Grid trigger documentation supports batch binding to `EventGridEvent[]` / `CloudEvent[]` in .NET isolated worker with the Event Grid extension. Updated the section and C# example to use `[EventGridTrigger] EventGridEvent[] events`.
- The retry section said an unhandled Event Grid trigger exception causes the function to return a 500 status code. Microsoft documents Event Grid retries as subscription-level retry behavior, and separately notes that Event Grid-triggered Functions do not let user code control the returned HTTP status code. Updated the wording to say unhandled exceptions fail the invocation and Event Grid retries based on the subscription policy, while HTTP trigger/webhook should be used when exact HTTP response control is required.
- The scaling section described only the classic Consumption plan for serverless scale. Microsoft now recommends Flex Consumption for new serverless function apps and marks the classic Consumption plan as legacy. Added Flex Consumption and clarified the classic Consumption caveat.

## Review Notes
The remaining code samples, Azure CLI flags, Event Grid Azure Function destination resource IDs, batching flags, retry policy property names, and Bicep destination shape align with current Microsoft documentation. The Python sample imports `json` without using it, but that is harmless and not a technical correctness issue.
