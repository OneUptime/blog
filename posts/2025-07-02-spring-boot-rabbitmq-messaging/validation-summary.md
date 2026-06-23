# Validation Summary: How to Use RabbitMQ with Spring Boot

## Status
validated

## Post Type
Tutorial / Guide — hands-on walkthrough of integrating RabbitMQ with Spring Boot using Spring AMQP, covering configuration, producers, consumers, error handling, testing, and production patterns.

## Technologies Covered
- Java (17+, uses switch expressions and records-era syntax)
- Spring Boot / Spring AMQP (`spring-boot-starter-amqp`)
- RabbitMQ (AMQP 0-9-1)
- Lombok
- Jackson (JSON serialization)
- Spring Retry
- Micrometer (metrics)
- Spring Boot Actuator (health indicators)
- Testcontainers + Awaitility (integration testing)
- JUnit 5 / Mockito

## Sources Consulted
- Spring AMQP reference documentation — https://docs.spring.io/spring-amqp/reference/
- Spring AMQP `MessageProperties` API (4.0.x / 3.2.x) — https://docs.spring.io/spring-amqp/api/org/springframework/amqp/core/MessageProperties.html
- Spring AMQP Delayed Message Exchange — https://docs.spring.io/spring-amqp/reference/amqp/delayed-message-exchange.html
- spring-amqp issue #2602 (setDelay/setDelayLong) — https://github.com/spring-projects/spring-amqp/issues/2602
- RabbitMQ Priority Queues documentation — https://www.rabbitmq.com/docs/priority
- RabbitMQ Queues / Dead Letter Exchanges documentation — https://www.rabbitmq.com/docs/queues
- Spring Boot RabbitMQ configuration properties (`spring.rabbitmq.*`)

## Issues Found
1. **Deprecated `MessageProperties.setDelay(int)` API.** In `publishDelayedNotification`, the post called `message.getMessageProperties().setDelay((int) delayMs)`. `setDelay(Integer)` was deprecated in Spring AMQP in favor of `setDelayLong(Long)` (the `x-delay` header on the RabbitMQ delayed-message plugin supports values larger than `Integer.MAX_VALUE`, so the int-based API was deprecated). Since the `delayMs` parameter is already a `long`, the down-cast was both lossy and unnecessary. **Fix:** changed the call to `message.getMessageProperties().setDelayLong(delayMs)`.

2. **Priority publishing had no effect — missing `x-max-priority` queue argument.** The `publishPriorityNotification` method sets a per-message priority via `setPriority(...)`, but RabbitMQ only honors message priority when the destination queue is declared with the `x-max-priority` argument. The notification queue (the queue priority notifications are routed to) was declared without it, so the documented priority feature would silently be ignored (every message treated as priority 0). **Fix:** added `.withArgument("x-max-priority", 10)` to the `notificationQueue()` bean so the published priorities (0–9) actually take effect.

## Review Notes
- The four exchange types (Direct, Fanout, Topic, Headers) and the topic wildcard semantics (`*` = exactly one word, `#` = zero or more words) are described correctly.
- The Spring Boot configuration properties (`publisher-confirm-type: correlated`, `publisher-returns`, `listener.simple.*` including `acknowledge-mode`, `concurrency`, `max-concurrency`, `prefetch`, `retry.*`) are all valid current property names.
- `RabbitTemplate.setConfirmCallback` / `setReturnsCallback` (the newer `ReturnsCallback` with `ReturnedMessage`) and the `getReplyCode()` / `getReplyText()` accessors are used correctly.
- Manual-ack consumer flow (`basicAck` / `basicNack` with `requeue` true/false) and dead-letter routing (`x-dead-letter-exchange`, `x-dead-letter-routing-key`, `x-message-ttl` = 86400000 ms = 24 h) are accurate. The `x-first-death-*` header names used in the DLQ consumer are correct.
- Design caveat (not a correctness bug, left as-is): with manual acknowledgment and `try/catch` blocks that swallow exceptions inside the listener methods, the `application.yml` `listener.simple.retry` settings, the `ConditionalRejectingErrorHandler`, and the standalone `retryInterceptor()` bean will not be exercised — the channel-level ack/nack logic takes precedence. The `retryInterceptor` bean is also defined but never wired into the container factory. These are reasonable as illustrative snippets but readers should pick one strategy (container retry/error-handler *or* manual ack), not both.
- The top concept diagram shows a single exchange routing both exact keys (`order.created`) and a wildcard (`order.*`); a single concrete exchange cannot mix Direct and Topic behavior. It reads as an intentional conceptual illustration of routing rather than one exchange instance, so it was left unchanged.
- The explicit `jackson-databind` dependency is redundant (pulled in transitively by the web/JSON starters) but harmless.
- Testcontainers `RabbitMQContainer("rabbitmq:3.12-management")` and the `getHost()` / `getAmqpPort()` accessors are valid.
