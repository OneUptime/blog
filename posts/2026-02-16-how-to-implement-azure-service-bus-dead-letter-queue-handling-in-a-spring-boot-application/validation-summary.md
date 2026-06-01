# Validation Summary: How to Use Azure Service Bus Dead Letter Queue Handling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Bus
- Azure Service Bus dead-letter queues
- Azure SDK for Java
- Spring Boot
- Spring Cloud Azure
- Java
- Spring Boot Actuator health checks

## Sources Consulted
- Azure Service Bus dead-letter queues: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Enable dead lettering for Azure Service Bus queues and subscriptions: https://learn.microsoft.com/azure/service-bus-messaging/enable-dead-letter
- Use Azure Service Bus in Spring applications: https://learn.microsoft.com/en-us/azure/developer/java/spring-framework/using-service-bus-in-spring-applications
- ServiceBusReceivedMessageContext Java API: https://learn.microsoft.com/en-us/java/api/com.azure.messaging.servicebus.servicebusreceivedmessagecontext
- SubQueue Java API: https://learn.microsoft.com/en-us/java/api/com.azure.messaging.servicebus.models.subqueue
- ServiceBusAdministrationClient Java API: https://learn.microsoft.com/en-us/java/api/com.azure.messaging.servicebus.administration.servicebusadministrationclient
- QueueRuntimeProperties Java API: https://learn.microsoft.com/en-us/java/api/com.azure.messaging.servicebus.administration.models.queueruntimeproperties
- Azure Service Bus monitoring data reference: https://learn.microsoft.com/en-us/azure/service-bus-messaging/monitor-service-bus-reference

## Issues Found
- The post said expired messages go to the DLQ unconditionally. Azure Service Bus only moves expired messages to the DLQ when dead-lettering on message expiration is enabled, so the introduction and TTL bullet were corrected.
- The post described subscription filter evaluation failures without noting that dead-lettering on filter evaluation exceptions must be enabled. That condition was added.
- The dependency snippet pinned old individual dependency versions and omitted dependencies needed by the REST controller and health indicator. It now uses the Spring Cloud Azure BOM pattern and includes Spring Web, Spring Boot Actuator, and the Service Bus starter.
- The `OrderProcessor` snippet used `DeadLetterOptions` without importing its `com.azure.messaging.servicebus.models` package. The import was added.
- The `OrderProcessor` snippet caught an undefined `TransientException`, which would not compile. It now catches `ServiceBusException` and uses `isTransient()` to decide whether to abandon or dead-letter.
- The DLQ handler checked for `TTLExpired`, but Azure Service Bus uses the system dead-letter reason `TTLExpiredException`. The comparison was corrected.
- The retry-count code cast application properties directly to `int`, which can fail depending on the numeric wrapper type returned from message properties. It now handles `Number`.
- The `ALERT_AND_HOLD` branch abandoned DLQ messages, which can cause repeated redelivery by the active processor. It now defers the message to keep it in the DLQ for manual inspection without immediate processor loops.
- The REST count endpoint counted at most 1000 peeked messages, which is not an accurate DLQ count. It now uses `ServiceBusAdministrationClient.getQueueRuntimeProperties()` and `getDeadLetterMessageCount()`.
- The health indicator always returned `0` from `getDlqCount()`. It now retrieves the real dead-letter count through the Service Bus administration client.
- The summary said failed messages disappear silently without DLQ handling. That was softened to say they can sit unnoticed, which matches Azure Service Bus DLQ behavior.

## Review Notes
- The tutorial uses queue-based examples even though the configuration includes topic and subscription names. The topic values are harmless but unused in the snippets.
- The BOM version shown is suitable for the Spring Boot 3.1.x-3.5.x line referenced by current Spring Cloud Azure documentation. Projects on Spring Boot 4.x or newer should choose the matching current Spring Cloud Azure BOM version.
