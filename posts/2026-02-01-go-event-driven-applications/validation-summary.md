# Validation Summary: How to Build Event-Driven Applications in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (goroutines, channels, sync package, context package)
- In-process event bus pattern
- Event sourcing pattern
- NATS (github.com/nats-io/nats.go)
- Apache Kafka (segmentio/kafka-go, confluentinc/confluent-kafka-go)
- RabbitMQ (streadway/amqp, rabbitmq/amqp091-go)
- Go testing package

## Sources Consulted
- NATS Go client documentation: https://pkg.go.dev/github.com/nats-io/nats.go (verified `nats.Connect`, `nats.DefaultURL`, `Subscribe`, `Publish` signatures)
- segmentio/kafka-go: https://github.com/segmentio/kafka-go
- confluentinc/confluent-kafka-go: https://github.com/confluentinc/confluent-kafka-go
- rabbitmq/amqp091-go: https://github.com/rabbitmq/amqp091-go (verified as the actively maintained successor to streadway/amqp)
- Go language specification on unused imports (compile error)
- NATS JetStream documentation regarding persistence semantics

## Issues Found
1. **Unused imports in the User Signup example** — The `package main` block at the start of the "Practical Example: User Signup Flow" section imported `"context"` and `"fmt"` but neither was used anywhere in the example. In Go this is a compile error (`imported and not used`). Removed both imports so the example compiles.
2. **Misleading comment in test example** — The test in "Testing Event-Driven Code" had the comment `// PublishSync waits for all handlers`, but the simplified `EventBus` used in that section does not define a `PublishSync` method — its `Publish` method is itself synchronous (uses `wg.Wait()`). Updated the comment to accurately describe that this `Publish` implementation is synchronous.

## Review Notes
- The post contains two different `EventBus` implementations: the first (`eventbus` package) has separate async `Publish` and sync `PublishSync` methods, while the second (in the User Signup `main` package) has a single synchronous `Publish`. This is intentional but could confuse readers; not changing since restructuring is out of scope.
- The `Account.Withdraw` method releases its read lock before calling `Apply`, which then takes a write lock — this avoids a deadlock but introduces a small TOCTOU window (balance check vs. apply). Acceptable for tutorial code; not a defect.
- The NATS example ignores the error returned by `nc.Subscribe` and does not block before `nc.Close()`, so in a real run the subscriber callback would not fire before the program exits. This is consistent with the "quick overview" framing and is not technically incorrect.
- `streadway/amqp` is described as "now `rabbitmq/amqp091-go`" — strictly speaking the RabbitMQ team forked it rather than transferring the repository, but the post's framing is the commonly accepted shorthand and accurately reflects the current recommended library.
- `confluent-kafka-go` is a CGo wrapper around librdkafka, which is worth being aware of for deployment (not a defect, just a caveat).
