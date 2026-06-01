# Validation Summary: How to Build a Multi-Tenant Background Job Processor with Azure Service Bus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Service Bus queues
- Azure CLI
- Azure.Messaging.ServiceBus for .NET
- ASP.NET Core BackgroundService
- Multi-tenant background job processing
- Dead-letter queues
- Scheduled messages

## Sources Consulted
- Microsoft Learn: Azure CLI `az servicebus queue create` reference, https://learn.microsoft.com/cli/azure/servicebus/queue
- Microsoft Learn: Enable dead lettering for Azure Service Bus queues and subscriptions, https://learn.microsoft.com/azure/service-bus-messaging/enable-dead-letter
- Microsoft Learn: Azure Service Bus message sessions, https://learn.microsoft.com/azure/service-bus-messaging/message-sessions
- Microsoft Learn: Enable Azure Service Bus message sessions, https://learn.microsoft.com/azure/service-bus-messaging/enable-message-sessions
- Microsoft Learn: ServiceBusSender.ScheduleMessageAsync and ServiceBusMessage.ScheduledEnqueueTime, https://learn.microsoft.com/dotnet/api/azure.messaging.servicebus.servicebussender.schedulemessageasync and https://learn.microsoft.com/dotnet/api/azure.messaging.servicebus.servicebusmessage.scheduledenqueuetime
- Microsoft Learn: ServiceBusProcessorOptions.MaxAutoLockRenewalDuration, https://learn.microsoft.com/dotnet/api/azure.messaging.servicebus.servicebusprocessoroptions.maxautolockrenewalduration
- Microsoft Learn: Service Bus message transfers, locks, and settlement, https://learn.microsoft.com/azure/service-bus-messaging/message-transfers-locks-settlement

## Issues Found
- The queue creation commands used `--dead-lettering-on-message-expiration`, but the current Azure CLI option is `--enable-dead-lettering-on-message-expiration`. Updated all queue creation examples.
- The post set `SessionId` while creating regular queues and using `CreateProcessor`. Service Bus sessions require session-enabled entities and session processors for ordered session processing. Removed `SessionId` from the baseline code and added a note explaining when to enable sessions and use session processors.
- The text claimed workers pull from queues in priority order. The code actually starts processors for all queues and gives higher-priority queues more capacity. Updated the description to match the implementation.
- The per-tenant concurrency counter used a non-atomic check-then-increment pattern and abandoned messages when a tenant was at the limit. This could exceed the tenant limit and could also increment delivery count for healthy jobs. Replaced it with per-tenant `SemaphoreSlim` throttling.
- The worker allowed jobs to run up to 30 minutes while relying on queue lock durations of 1, 5, and 10 minutes. Added `MaxAutoLockRenewalDuration = TimeSpan.FromMinutes(35)` to keep message locks renewable during long-running jobs.
- The original fairness statement implied the per-tenant limit was global across all workers. Clarified that the in-memory semaphore is per worker process and that a shared lease or distributed semaphore is needed for a pool-wide limit.

## Review Notes
The examples remain illustrative and omit surrounding application code such as dependency injection registrations, interface definitions, authentication, and repository implementations. The Azure Service Bus SDK used is the current `Azure.Messaging.ServiceBus` package family; legacy Service Bus SDK packages are not used.
