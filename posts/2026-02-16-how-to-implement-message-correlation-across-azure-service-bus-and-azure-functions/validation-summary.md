# Validation Summary: How to Use Message Correlation Across Azure Service Bus and Azure Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Bus
- Azure Functions Service Bus triggers
- JavaScript and Node.js
- @azure/service-bus
- Azure Cosmos DB JavaScript SDK
- Application Insights for Node.js
- Distributed tracing and message correlation

## Sources Consulted
- Azure Service Bus JavaScript `ServiceBusMessage` interface: https://learn.microsoft.com/en-us/javascript/api/%40azure/service-bus/servicebusmessage
- Azure Functions Service Bus trigger documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus-trigger
- Azure Service Bus message sessions documentation: https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions
- Azure Service Bus end-to-end tracing documentation: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-end-to-end-tracing
- Application Insights Node.js monitoring documentation: https://learn.microsoft.com/en-us/azure/application-insights/app-insights-nodejs
- Azure Cosmos DB JavaScript item creation documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-javascript-create-item
- Azure Cosmos DB JavaScript query documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-javascript-query-items

## Issues Found
- The Azure Functions Service Bus trigger examples treated the JavaScript trigger parameter as a full Service Bus message object. In the `module.exports = async function (context, message)` model used by the post, that parameter is the message body, while metadata such as `correlationId`, `messageId`, `replyTo`, and session metadata comes from binding metadata. Updated the examples to read those values from `context.bindingData`.
- The validation failure example called a custom `validation-failures` queue a dead-letter destination. Updated the variable name and comment to describe it as a failure queue, since sending to a normal queue is not the same operation as Service Bus dead-lettering.
- The request-reply sample received one message and threw an error if that message did not match the request correlation ID, which could temporarily lock another caller's reply on a shared reply queue. Updated the sample to keep receiving until timeout and abandon nonmatching replies.
- The session explanation said messages with the same `SessionId` are always processed by the same consumer. Updated it to the more precise Service Bus behavior: one session receiver holds the session lock at a time and receives messages in order while it holds that lock.
- The session-trigger and tracking examples were updated to use the trigger body as the business payload and binding metadata for Service Bus properties.

## Review Notes
The post now uses the current `@azure/service-bus` message property names for sends and avoids retired Service Bus SDKs. For new Azure Functions projects, the JavaScript v4 programming model and SDK bindings can provide direct access to SDK message types, but the corrected examples are consistent with the older function style already used in the article.
