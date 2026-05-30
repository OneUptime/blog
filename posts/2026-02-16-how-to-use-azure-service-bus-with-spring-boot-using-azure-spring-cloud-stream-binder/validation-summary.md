# Validation Summary: Use Azure Service Bus with Spring Boot Using azure-spring-cloud-stream-binder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Bus
- Azure CLI
- Spring Boot
- Spring Cloud Stream
- Spring Cloud Azure Stream Binder for Service Bus
- Java
- Maven
- YAML

## Sources Consulted
- Microsoft Learn: Spring Cloud Stream with Azure Service Bus - https://learn.microsoft.com/en-us/azure/developer/java/spring-framework/configure-spring-cloud-stream-binder-java-app-with-service-bus
- Microsoft Learn: Spring Cloud Azure support for Spring Cloud Stream - https://learn.microsoft.com/en-us/azure/developer/java/spring-framework/spring-cloud-stream-support
- Spring Cloud Stream reference: Producing and Consuming Messages - https://docs.spring.io/spring-cloud-stream/reference/spring-cloud-stream/producing-and-consuming-messages.html
- Microsoft Learn: Service Bus dead-letter queues - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Microsoft Learn: Enable dead lettering for Azure Service Bus queues and subscriptions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/enable-dead-letter
- Microsoft Learn: Azure CLI `az servicebus queue` - https://learn.microsoft.com/en-us/cli/azure/servicebus/queue?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az servicebus namespace` - https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az servicebus topic` - https://learn.microsoft.com/en-us/cli/azure/servicebus/topic?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az servicebus topic subscription` - https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription?view=azure-cli-latest
- Spring Boot documentation overview - https://docs.spring.io/spring-boot/3.5/documentation.html

## Issues Found
- The post used the outdated binder name `azure-spring-cloud-stream-binder`. Updated the title and text to the current artifact name, `spring-cloud-azure-stream-binder-servicebus`.
- The Maven snippet used older Spring Boot and Spring Cloud Azure versions and declared a version directly on the binder dependency. Updated the snippet to Spring Boot 3.5.14 and Spring Cloud Azure BOM 5.25.0, and removed the direct binder dependency version so the BOM manages it.
- The configuration included multiple functional consumer beans but did not set `spring.cloud.function.definition`. Added `orderInput;notificationInput` so Spring Cloud Stream binds the intended functions.
- The dead-lettering section implied that enabling dead-lettering on message expiration handles failed processing after retries. Corrected this to distinguish Spring Cloud Azure binder `requeue-rejected`, Service Bus `max-delivery-count`, and expiration dead-lettering.
- The dead-letter consumer example only showed a Java `Consumer` bean and did not bind it to the Service Bus dead-letter subqueue. Added the required binding configuration using `sub-queue: DEAD_LETTER_QUEUE`.

## Review Notes
The Azure CLI commands for creating the resource group, namespace, queue, topic, and subscriptions use valid command groups and parameters according to Microsoft Learn. The local environment did not have Azure CLI installed, so CLI verification was performed against official Azure CLI documentation rather than local `az --help` output.
