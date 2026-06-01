# Validation Summary: How to Build an Event-Driven Microservice with Azure Service Bus and NestJS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Bus
- Azure CLI
- Azure Container Apps
- NestJS
- TypeScript
- @azure/service-bus JavaScript SDK
- @nestjs/config

## Sources Consulted
- Azure Service Bus overview: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview
- Azure Service Bus queues, topics, and subscriptions: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions
- Azure Service Bus topic filters: https://learn.microsoft.com/en-us/azure/service-bus-messaging/topic-filters
- Azure Service Bus SQL filter syntax: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-sql-filter
- Azure Service Bus dead-letter queues and dead-lettering: https://learn.microsoft.com/en-us/azure/service-bus-messaging/enable-dead-letter
- Azure Service Bus JavaScript SDK API reference: https://learn.microsoft.com/en-us/javascript/api/overview/azure/service-bus-readme
- ServiceBusClient JavaScript API reference: https://learn.microsoft.com/en-us/javascript/api/@azure/service-bus/servicebusclient
- SubscribeOptions JavaScript API reference: https://learn.microsoft.com/en-us/javascript/api/@azure/service-bus/subscribeoptions
- Azure CLI Service Bus namespace command reference: https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace
- Azure CLI Service Bus topic command reference: https://learn.microsoft.com/en-us/cli/azure/servicebus/topic
- Azure CLI Service Bus topic subscription command reference: https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription
- Azure CLI Service Bus topic subscription rule command reference: https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription/rule
- Azure Container Apps secrets documentation: https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets
- Azure Container Apps CLI command reference: https://learn.microsoft.com/en-us/cli/azure/containerapp
- NestJS modules documentation: https://docs.nestjs.com/modules
- NestJS lifecycle events documentation: https://docs.nestjs.com/fundamentals/lifecycle-events
- NestJS configuration documentation: https://docs.nestjs.com/techniques/configuration

## Issues Found
- The ServiceBusModule used ConfigService without importing ConfigModule. Added ConfigModule.forRoot({ isGlobal: true }) so dependency injection and environment loading work as shown.
- The Service Bus connection string could be undefined at runtime. Added an explicit configuration check before constructing ServiceBusClient.
- getSender returned a possibly undefined map lookup in TypeScript. Added a non-null assertion after the sender is created or found.
- sendBatch created a new batch after the first batch filled, but did not send that new batch. Reworked the loop so each full batch is sent and oversize messages are rejected clearly.
- The subscription handlers manually completed and abandoned messages while leaving auto-complete at the SDK default. Added autoCompleteMessages: false to both subscribe calls.
- The catch blocks accessed err.message directly. Updated them to handle unknown thrown values safely.
- The dead-letter queue sample accessed serviceBus.client even though the field was private. Added createQueueDeadLetterReceiver() and updated the sample to use it.
- The subscription filtering example referenced a shipping-notifications subscription that had not been created. Added the subscription creation command.
- The filtering example did not remove the default match-all subscription rule, so the custom filter would not limit delivery. Added deletion of the quoted '$Default' rule before creating the shipped-only rule.
- The Container Apps deployment examples referenced a secret without defining it. Added --secrets entries and quoted the secret-backed environment variable references.

## Review Notes
The Azure CLI binary was not installed in the local workspace, so CLI syntax was checked against Microsoft Learn command references rather than local `az --help` output. The tutorial still uses connection strings for simplicity; for production, managed identity or Key Vault-backed secrets would be preferable.
