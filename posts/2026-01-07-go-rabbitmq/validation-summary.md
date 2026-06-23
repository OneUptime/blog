# Validation Summary: How to Use RabbitMQ in Go with amqp091-go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- RabbitMQ
- AMQP 0.9.1
- rabbitmq/amqp091-go
- Docker
- Publisher confirms
- Consumer acknowledgments
- Exchanges, queues, dead letter queues, TTL, priority queues, and prefetch

## Sources Consulted
- RabbitMQ amqp091-go package documentation: https://pkg.go.dev/github.com/rabbitmq/amqp091-go
- RabbitMQ official exchange documentation: https://www.rabbitmq.com/docs/exchanges
- RabbitMQ official acknowledgements and publisher confirms documentation: https://www.rabbitmq.com/docs/confirms
- RabbitMQ official dead letter exchange documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ official TTL documentation: https://www.rabbitmq.com/docs/ttl
- RabbitMQ official queue length limit documentation: https://www.rabbitmq.com/docs/maxlength
- RabbitMQ official priority queue documentation: https://www.rabbitmq.com/docs/priority
- RabbitMQ official consumer prefetch documentation: https://www.rabbitmq.com/docs/consumer-prefetch
- Docker official RabbitMQ image documentation: https://hub.docker.com/_/rabbitmq

## Issues Found
- The publisher confirms example imported `log` without using it, which would make the self-contained Go example fail to compile. Replaced it with `strconv`, which is used by the corrected batch error message.
- The batch publisher used `string(rune(i))` to include the failed message index in an error. That converts the integer to a Unicode code point, not a decimal string. Changed it to `strconv.Itoa(i)`.
- The consumer retry example read `x-death` to count retries after `Nack(false, true)`. RabbitMQ only updates dead-letter history when messages are dead-lettered, not when they are simply requeued. Changed the example to reject without requeue so configured DLQs receive failed messages, and pointed bounded retries to the delay-queue pattern shown later.
- The delayed retry helper republished the failed message but did not acknowledge the original delivery after a successful publish, leaving the original message unacked. Changed it to ack the original delivery after the delayed publish succeeds.
- The resilient order-processing example reused one `amqp091-go` channel across multiple worker goroutines. The official `amqp091-go` docs state channels are not thread-safe. Added a `NewChannel` helper for dedicated caller channels, used it for setup and consumers, and serialized publishing on the shared confirm channel with a mutex.
- The complete example described itself as a complete production-ready system while depending on the previous `ResilientConnection` snippet. Adjusted the wording to state that it uses the previous section's connection type.

## Review Notes
The RabbitMQ concepts, Docker command, exchange behavior, TTL argument, DLQ configuration, publisher confirms, manual acknowledgments, prefetch usage, and priority queue argument were consistent with current official documentation. In a future production-focused revision, prefer RabbitMQ policies over hardcoded queue `x-arguments` for DLX and TTL settings when operational flexibility matters.
