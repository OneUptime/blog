# Validation Summary: How to Build Message Consumers with Spring AMQP

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Java
- Spring Boot
- Spring AMQP
- Spring Retry
- RabbitMQ
- AMQP message acknowledgments
- RabbitMQ dead letter exchanges and queues

## Sources Consulted
- Spring AMQP Reference: Message Listener Container Configuration - https://docs.spring.io/spring-amqp/reference/amqp/containerAttributes.html
- Spring AMQP Reference: Resilience, Recovering from Errors and Broker Failures - https://docs.spring.io/spring-amqp/reference/amqp/resilience-recovering-from-errors-and-broker-failures.html
- Spring AMQP API: RejectAndDontRequeueRecoverer - https://docs.spring.io/spring-amqp/api/org/springframework/amqp/rabbit/retry/RejectAndDontRequeueRecoverer.html
- Spring Boot Reference: AMQP - https://docs.spring.io/spring-boot/reference/messaging/amqp.html
- Spring Boot Reference: Common Application Properties - https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- RabbitMQ Documentation: Dead Letter Exchanges - https://www.rabbitmq.com/docs/dlx
- Maven Central: spring-boot-starter-amqp dependency metadata - https://central.sonatype.com/artifact/org.springframework.boot/spring-boot-starter-amqp
- Maven Central: spring-retry dependency metadata - https://central.sonatype.com/artifact/org.springframework.retry/spring-retry

## Issues Found
- The listener retry property used `spring.rabbitmq.listener.simple.retry.max-attempts`, which is superseded in current Spring Boot documentation by `max-retries`. Updated the YAML configuration to use `max-retries`.
- The retry examples use `RetryTemplate`, `SimpleRetryPolicy`, and `ExponentialBackOffPolicy`, which require Spring Retry. Added the `org.springframework.retry:spring-retry` dependency to the Maven snippet.
- The typed listener claimed JSON conversion would happen automatically without making the Jackson converter dependency explicit in that context. Clarified the listener comment to say conversion works with the Jackson converter configured later in the post.
- `RecoverableException` was declared package-private in the `com.example.consumer` package but referenced from `com.example.consumer.config.RetryConfig`, which would not compile. Split it into a public `RecoverableException.java` snippet and imported it in `RetryConfig`.

## Review Notes
The core RabbitMQ dead-lettering behavior, manual `basicAck` / `basicNack` usage, Spring AMQP listener concurrency settings, and `RejectAndDontRequeueRecoverer` explanation are consistent with official documentation. For future updates, consider noting that RabbitMQ recommends DLX policies over hardcoded queue `x-arguments` when operational flexibility is important.
