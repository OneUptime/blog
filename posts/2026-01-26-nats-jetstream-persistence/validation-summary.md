# Validation Summary: How to Use NATS JetStream for Persistence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NATS Server
- NATS JetStream
- Go
- github.com/nats-io/nats.go
- Prometheus Go client
- Docker

## Sources Consulted
- NATS JetStream model deep dive: https://docs.nats.io/using-nats/developer/develop_jetstream/model_deep_dive
- NATS JetStream streams and retention policies: https://docs.nats.io/nats-concepts/jetstream/streams
- NATS JetStream concepts: https://docs.nats.io/nats-concepts/jetstream
- NATS source and mirror streams: https://docs.nats.io/nats-concepts/jetstream/source_and_mirror
- NATS queue groups and JetStream as a queue: https://docs.nats.io/nats-concepts/core-nats/queue
- NATS Go client package documentation: https://pkg.go.dev/github.com/nats-io/nats.go
- NATS Go JetStream package documentation: https://pkg.go.dev/github.com/nats-io/nats.go/jetstream
- NATS Go client repository: https://github.com/nats-io/nats.go

## Issues Found
- The post overclaimed JetStream "exactly-once delivery" and exactly-once consumer semantics. Updated the description, introduction, exactly-once section, idempotent consumer comments, and conclusion to distinguish publisher deduplication from consumer-side idempotency and confirmed acknowledgments.
- The idempotent consumer used `msg.Ack()` after committing the database transaction. Changed it to `msg.AckSync()` so the client waits for the server to confirm receipt of the acknowledgment, matching NATS guidance for exactly-once consumption.
- The replay examples used non-existent legacy nats.go options `nats.DeliverByStartTime` and `nats.DeliverByStartSequence`. Replaced them with the documented `nats.StartTime` and `nats.StartSequence` options.
- The push consumer example called `sub.ConsumerInfo().Name` as if `ConsumerInfo()` returned one value. Updated it to handle the `(*nats.ConsumerInfo, error)` return values.
- The retention policy descriptions were imprecise. Clarified `WorkQueuePolicy` deletion after acknowledgment by the matching consumer and `InterestPolicy` deletion after all matching consumers acknowledge.
- The dead letter stream used `orders.dlq.>`, which overlaps the main `orders.>` stream subject and can cause stream subject conflicts and reprocessing loops. Changed DLQ subjects to `orders-dlq.>`.
- The production consumer described `RateLimit` as messages per second. Updated it to bits per second and added a `DeliverSubject` because rate limiting, flow control, and idle heartbeats are push-consumer settings.

## Review Notes
The examples use the legacy `nats.JetStream()` / `nats.JetStreamContext` API, which is still documented, but official nats.go documentation now recommends the newer `github.com/nats-io/nats.go/jetstream` package for new code. The local environment did not have the Go toolchain installed, so code examples were checked against official package documentation rather than compiled locally.
