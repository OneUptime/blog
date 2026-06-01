# Validation Summary: How to Schedule Messages in Azure Service Bus for Delayed Delivery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Bus
- Azure.Messaging.ServiceBus .NET SDK
- C#
- Azure Functions Service Bus trigger

## Sources Consulted
- Microsoft Learn: ServiceBusSender.ScheduleMessageAsync - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebussender.schedulemessageasync
- Microsoft Learn: ServiceBusSender.CancelScheduledMessageAsync - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebussender.cancelscheduledmessageasync
- Microsoft Learn: ServiceBusSender.ScheduleMessagesAsync - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebussender.schedulemessagesasync
- Microsoft Learn: ServiceBusReceivedMessage class - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusreceivedmessage
- Microsoft Learn: ProcessMessageEventArgs.EntityPath - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.processmessageeventargs.entitypath
- Microsoft Learn: Azure Service Bus message sequencing and scheduled messages - https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing
- Microsoft Learn: Browse or peek messages - https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-browsing
- Microsoft Learn: Azure Service Bus quotas - https://learn.microsoft.com/azure/service-bus-messaging/service-bus-quotas

## Issues Found
- Changed scheduling method parameters from `DateTime` to `DateTimeOffset` to match the `Azure.Messaging.ServiceBus` scheduling APIs, which use UTC `DateTimeOffset` values for scheduled enqueue times.
- Replaced a misleading comment that implied application properties provide session-based ordering. Service Bus sessions require the `SessionId` message property and a session-enabled entity; the sample now describes the user ID as application metadata.
- Fixed the delayed retry example's retry-attempt conversion. The original `(int)(long)val` cast could fail when the application property is materialized as an `int`; `Convert.ToInt32(val)` handles supported numeric property values more safely.
- Added a null guard in the timeout completion example so a missing process record does not cause a `NullReferenceException`.
- Replaced the unsupported "approximately 1 second" scheduling precision claim with wording aligned to Microsoft guidance that scheduled enqueue time controls availability, while actual processing depends on queue and receiver conditions.

## Review Notes
- Scheduled messages can be peeked before their scheduled enqueue time. Microsoft documentation notes this applies to queues, while scheduled messages are not included when peeking subscriptions.
- Microsoft documentation notes that messages larger than 1 MB can only be scheduled by setting the scheduled enqueue time on the message and using the regular send API.
