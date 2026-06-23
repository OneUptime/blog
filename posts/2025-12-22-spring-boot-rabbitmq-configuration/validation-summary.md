# Validation Summary: How to Configure Spring Boot with RabbitMQ

## Status
validated

## Post Type
Tutorial / Guide — a hands-on walkthrough of configuring RabbitMQ with Spring Boot (Spring AMQP), covering dependencies, exchanges/queues/bindings, producers, consumers, exchange types, error handling, production config, and integration testing.

## Technologies Covered
- Java
- Spring Boot (Spring AMQP, `spring-boot-starter-amqp`)
- RabbitMQ (AMQP 0-9-1)
- Lombok
- Jackson (JSON message conversion)
- Spring Retry
- Testcontainers (RabbitMQ integration testing)

## Sources Consulted
- Spring AMQP `BindingBuilder` source (HeadersExchange fluent API): https://github.com/spring-projects/spring-amqp/blob/main/spring-amqp/src/main/java/org/springframework/amqp/core/BindingBuilder.java
- Spring AMQP `BaseRabbitListenerContainerFactory` Javadoc (`setRetryTemplate`, `setAdviceChain`): https://docs.spring.io/spring-amqp/api/org/springframework/amqp/rabbit/config/BaseRabbitListenerContainerFactory.html
- Spring AMQP `RetryInterceptorBuilder` Javadoc (3.2.5): https://docs.spring.io/spring-amqp/docs/3.2.5/api/org/springframework/amqp/rabbit/config/RetryInterceptorBuilder.html
- Spring AMQP `SimpleRabbitListenerContainerFactory` Javadoc: https://docs.spring.io/spring-amqp/api/org/springframework/amqp/rabbit/config/SimpleRabbitListenerContainerFactory.html
- Baeldung — Exponential Backoff With Spring AMQP: https://www.baeldung.com/spring-amqp-exponential-backoff

## Issues Found

1. **Headers Exchange binding did not compile.** The original `headersBinding` used a fluent chain that does not exist in Spring AMQP:
   ```java
   BindingBuilder.bind(queue).to(exchange)
       .where("x-match").matches("all")
       .and("type").exists()
       .and("priority").matches("high");
   ```
   In `BindingBuilder.HeadersExchangeMapConfigurer`, `where(String).matches(Object)` (and `exists()`) returns a terminal `Binding` — there is no `.and(...)` chaining for additional headers. Matching multiple headers is done via `whereAll(Map)` / `whereAny(Map)` (which set `x-match=all` / `x-match=any` respectively) terminated by `.match()`. Replaced with a valid equivalent:
   ```java
   BindingBuilder.bind(queue).to(exchange)
       .whereAll(Map.of("type", "order", "priority", "high"))
       .match();
   ```

2. **Consumer retry used the wrong API for its stated purpose.** The "Consumer with Retry Configuration" section called `factory.setRetryTemplate(retryTemplate())` to retry consumer message processing. On the listener container factory, `setRetryTemplate(RetryTemplate)` is documented as a `RetryTemplate` "to use when sending replies" — it does **not** retry inbound message processing/delivery. Consumer-side retry is configured through the advice chain. Changed the factory to use `setAdviceChain(...)` with a `RetryInterceptorBuilder`, wiring the existing `RetryTemplate` through it:
   ```java
   factory.setAdviceChain(retryInterceptor());
   ...
   @Bean
   public RetryOperationsInterceptor retryInterceptor() {
       return RetryInterceptorBuilder.stateless()
           .retryOperations(retryTemplate())
           .build();
   }
   ```
   Added the required imports (`RetryInterceptorBuilder`, `RetryOperationsInterceptor`). `RetryTemplate` implements `RetryOperations`, so it is accepted by `retryOperations(...)`; the stateless `build()` returns a `RetryOperationsInterceptor`. Verified against the 3.2.x API (the version era this post targets).

## Review Notes
- `MessageProperties.setDelay(int)` (used in `sendDelayedMessage`) still works but has been deprecated in recent Spring AMQP (3.1+) in favour of `setDelayLong(Long)`. Left as-is since the post does not pin a version and the method remains functional, but worth updating if the post is revised for Spring AMQP 4.x. The delayed-message feature also requires the `rabbitmq_delayed_message_exchange` plugin and an `x-delayed-message` exchange — the post correctly notes the plugin dependency in a comment.
- The integration test loads the full application context (`@SpringBootTest`), so the live `@RabbitListener` consumer competes with the test's manual `rabbitTemplate.receiveAndConvert(...)` on the same queue, which could make the assertion flaky in practice. This is a test-design caveat, not an API error, so it was left unchanged.
- All other code was verified as correct: `QueueBuilder`/`BindingBuilder` usage, DLQ arguments (`x-dead-letter-exchange`, `x-dead-letter-routing-key`, `x-message-ttl` = 86400000 ms = 24h), `RabbitTemplate` confirm/returns callbacks (`setConfirmCallback`, `setReturnsCallback`, `ReturnedMessage.getMessage()`), topic wildcard semantics (`*` = one word, `#` = zero-or-more words), `ConditionalRejectingErrorHandler.DefaultExceptionStrategy` extension, `application.yml` property names (`publisher-confirm-type: correlated`, listener/cache/SSL settings), and the Testcontainers `RabbitMQContainer` setup with `@DynamicPropertySource`.
