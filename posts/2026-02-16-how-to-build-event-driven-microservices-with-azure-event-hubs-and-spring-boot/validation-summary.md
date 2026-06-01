# Validation Summary: How to Build Event-Driven Microservices with Azure Event Hubs and Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Event Hubs
- Azure CLI
- Apache Kafka protocol for Event Hubs
- Spring Boot
- Spring Cloud Stream
- Spring Cloud Stream Kafka Binder
- Java

## Sources Consulted
- Microsoft Learn: Azure Event Hubs for Apache Kafka - https://learn.microsoft.com/en-gb/azure/event-hubs/azure-event-hubs-apache-kafka-overview
- Microsoft Learn: Apache Kafka client configurations for Azure Event Hubs - https://learn.microsoft.com/en-us/azure/event-hubs/apache-kafka-configurations
- Microsoft Learn: Using Event Hubs in Spring applications - https://learn.microsoft.com/en-us/azure/developer/java/spring-framework/using-event-hubs-in-spring-applications
- Microsoft Learn: az eventhubs namespace create - https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace
- Microsoft Learn: az eventhubs eventhub create - https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub
- Microsoft Learn: Compare Azure Event Hubs tiers - https://learn.microsoft.com/en-us/azure/event-hubs/compare-tiers
- Spring Cloud Stream Reference: Producing and Consuming Messages / StreamBridge - https://docs.spring.io/spring-cloud-stream/reference/4.3/spring-cloud-stream/producing-and-consuming-messages.html
- Spring Cloud Stream Reference: Functional binding names - https://docs.spring.io/spring-cloud-stream/reference/spring-cloud-stream/functional-binding-names.html
- Spring Cloud Stream Reference: Kafka binder dead-letter topic processing - https://docs.spring.io/spring-cloud-stream/reference/kafka/kafka-binder/dlq.html
- Spring Cloud Stream Reference: Kafka binder configuration options - https://docs.spring.io/spring-cloud-stream/reference/kafka/kafka-binder/config-options.html

## Issues Found
- The Notification Service defined two `Consumer` beans but did not include an `application.yml` snippet with `spring.cloud.function.definition` or input bindings. Added configuration for `orderNotification` and `paymentNotification` so Spring Cloud Stream binds each consumer to the intended Event Hub.
- The Payment Service used a dotted `cloud.function.definition` key beside the nested `cloud.stream` configuration. Reworked it to the documented nested `spring.cloud.function.definition` shape for clarity and correctness.
- The Order Service included an empty function definition even though `StreamBridge` does not require a function bean. Removed the empty property to avoid implying that a producer function must be configured.
- The retry/DLQ example referenced `order-events-dlq`, but the setup commands did not create that Event Hub. Added a matching `az eventhubs eventhub create` command.
- The advantages list overstated scaling and pricing as universally automatic/pay-per-throughput-unit. Updated the wording to reflect managed scaling options and Standard-tier throughput-unit pricing.

## Review Notes
The examples intentionally omit build files and some package declarations for brevity. A production-ready version should also avoid `RootManageSharedAccessKey` in application configuration, use least-privilege authorization, and externalize secrets through environment variables or a secret store.
