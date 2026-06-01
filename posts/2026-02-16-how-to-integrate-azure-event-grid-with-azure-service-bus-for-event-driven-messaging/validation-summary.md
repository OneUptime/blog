# Validation Summary: Integrate Azure Event Grid with Azure Service Bus for Event-Driven Messaging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Event Grid
- Azure Service Bus queues, topics, subscriptions, sessions, and dead-letter queues
- Azure CLI
- Azure Functions Service Bus trigger
- JavaScript Azure SDK packages `@azure/service-bus` and `@azure/eventgrid`
- Event Grid filtering, delivery schemas, retry policy, and dead-lettering

## Sources Consulted
- Microsoft Learn: Configure Service Bus queues and topics as Event Grid handlers: https://learn.microsoft.com/en-us/azure/event-grid/handler-service-bus
- Microsoft Learn: Azure CLI `az eventgrid event-subscription create`: https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Microsoft Learn: Azure CLI `az servicebus queue create`: https://learn.microsoft.com/en-us/cli/azure/servicebus/queue
- Microsoft Learn: Set Event Grid dead-letter location and retry policy: https://learn.microsoft.com/en-us/azure/event-grid/manage-event-delivery
- Microsoft Learn: Event Grid event filtering and advanced filters: https://learn.microsoft.com/en-us/azure/event-grid/event-filtering
- Microsoft Learn: Azure Functions Service Bus trigger: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus-trigger
- Microsoft Learn: Azure Service Bus dead-letter queues and CLI settings: https://learn.microsoft.com/en-us/azure/service-bus-messaging/enable-dead-letter
- Microsoft Learn: Azure Service Bus JavaScript client library: https://learn.microsoft.com/en-us/javascript/api/overview/azure/service-bus-readme
- Microsoft Learn: Azure Event Grid JavaScript client library: https://learn.microsoft.com/en-us/javascript/api/overview/azure/eventgrid-readme

## Issues Found
- The post said Event Grid events are "lost after retries" when a processor is down. I changed this to say events are dropped or dead-lettered after Event Grid's retry policy is exhausted, which matches Event Grid's documented retry and dead-letter behavior.
- The post implied Service Bus generally provides ordered processing. I changed this to mention ordered workflows with sessions, because ordering in Service Bus depends on using session-aware entities and session IDs.
- The queue creation example set a message TTL but did not enable dead-lettering on message expiration. I added `--enable-dead-lettering-on-message-expiration true` so the example matches the later dead-lettering guidance.

## Review Notes
The JavaScript examples use current Azure SDK packages and APIs. The Azure Functions example uses the function.json-based JavaScript model, which is still documented, although Microsoft Learn now highlights the Node.js v4 programming model as the generally available model for new JavaScript and TypeScript functions.
