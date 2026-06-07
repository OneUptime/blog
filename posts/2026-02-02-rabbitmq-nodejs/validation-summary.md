# Validation Summary: How to Use RabbitMQ with Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ (message broker, AMQP 0-9-1 protocol)
- Node.js
- `amqplib` (Node.js client library for RabbitMQ)
- Docker (for running RabbitMQ locally)
- Express (used briefly in the health-check endpoint example)
- Jest-style integration testing (`describe`/`test`/`beforeAll`/`afterAll`)
- `uuid` package (for RPC correlation IDs)
- `msgpack-lite` (mentioned as optional binary serializer)

## Sources Consulted
- amqplib channel API reference: http://www.squaremobius.net/amqp.node/channel_api.html
- amqplib connection API reference: http://www.squaremobius.net/amqp.node/channel_api.html#connect
- RabbitMQ official tutorials (Node.js variants): https://www.rabbitmq.com/tutorials
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/dlx.html
- RabbitMQ Consumer Prefetch / QoS documentation: https://www.rabbitmq.com/consumer-prefetch.html
- RabbitMQ Publisher Confirms documentation: https://www.rabbitmq.com/confirms.html
- AMQP 0-9-1 specification (exchange types, topic wildcard semantics)
- Official RabbitMQ Docker image documentation: https://hub.docker.com/_/rabbitmq

## Issues Found
No technical issues found.

The following claims were verified against official documentation and all are correct:
- `amqp.connect()` accepts both URL strings and config objects with `protocol`, `hostname`, `port`, `username`, `password`, `vhost`.
- `createChannel()` and `createConfirmChannel()` API usage.
- `assertQueue`, `sendToQueue`, `prefetch`, `consume`, `ack`/`nack` (including `allUpTo` and `requeue` semantics), `assertExchange`, `bindQueue`, `publish`, `checkQueue`, `cancel`, `waitForConfirms`.
- Exchange types (`fanout`, `direct`, `topic`).
- Topic wildcard semantics: `*` = exactly one word, `#` = zero or more words.
- Dead-letter queue arguments (`x-dead-letter-exchange`, `x-dead-letter-routing-key`) and dead-letter headers (`x-first-death-exchange`, `x-first-death-queue`, `x-first-death-reason`, `x-death`).
- Message property paths (`msg.properties.replyTo`, `msg.properties.correlationId`, `msg.fields.routingKey`).
- Docker image `rabbitmq:3-management`, ports 5672 (AMQP) and 15672 (Management UI), default credentials `guest/guest`.

## Review Notes
- The `guest`/`guest` account is, by default, restricted to loopback (localhost) connections only. The post uses RabbitMQ locally throughout, so this is not incorrect, but readers deploying remotely will need to create a new user. Not worth changing in the post.
- The MessagePack content type `application/msgpack` is a community convention; there is no IANA-registered media type for MessagePack. `application/x-msgpack` is also commonly seen. Either is acceptable.
- `parseInt(process.env.RABBITMQ_PORT)` omits the radix argument. This works correctly (defaults to base 10 for non-`0x`-prefixed strings) but some linters flag it. Stylistic only, not a technical error.
- The work-queue consumer comment ("Setting requeue to false sends it to dead letter queue if configured") is informational about the alternative `nack(msg, false, false)` form; the actual call uses `requeue: true`. Mildly confusing but not incorrect.
- `RABBITMQ_PASS` is the env var name chosen in the basic connection example; RabbitMQ's own conventions use `RABBITMQ_DEFAULT_PASS` server-side. The post is using it as an application-level env var name, which is fine.
- The `waitForPendingMessages` placeholder in the graceful-shutdown example only polls a timeout — the post explicitly calls this out in a comment ("In practice, track this via a counter…"), so the simplification is honest.
