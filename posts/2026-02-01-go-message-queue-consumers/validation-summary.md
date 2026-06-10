# Validation Summary: How to Implement Message Queue Consumers in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (Golang)
- RabbitMQ (via `github.com/rabbitmq/amqp091-go`)
- NATS / NATS JetStream (via `github.com/nats-io/nats.go` and `github.com/nats-io/nats.go/jetstream`)
- Prometheus client library (`github.com/prometheus/client_golang`)
- AMQP 0-9-1 protocol concepts (acknowledgment, prefetch, dead-letter exchange/queue)

## Sources Consulted
- amqp091-go GoDoc: https://pkg.go.dev/github.com/rabbitmq/amqp091-go (Channel.Consume, Channel.Cancel, Channel.Qos, Channel.Publish/PublishWithContext, Channel.QueueDeclare, NotifyClose, Delivery.Ack/Nack)
- nats.go jetstream GoDoc: https://pkg.go.dev/github.com/nats-io/nats.go/jetstream (JetStream.Consumer, Consumer.Consume, Msg.Ack/Nak/NakWithDelay)
- nats.go GoDoc: https://pkg.go.dev/github.com/nats-io/nats.go (Connect options, Conn.Drain)
- Prometheus client_golang GoDoc: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus and `prometheus/promauto`
- RabbitMQ documentation on dead-letter exchanges and consumer acknowledgments: https://www.rabbitmq.com/dlx.html and https://www.rabbitmq.com/confirms.html

## Issues Found

1. **Consumer-tag bug in `Start` / `Shutdown` (real bug)** — `Channel.Consume` was called with an empty consumer tag, which makes the amqp091-go client generate a unique tag client-side. The original `Channel.Cancel("", false)` call would therefore never match the active consumer. Fixed by adding a `tag` field to the `Consumer` struct (initialised in `NewConsumer` as `"consumer-" + queue`), passing it to both `Consume` and `Cancel`, and updating the surrounding comments.

2. **Misleading NATS JetStream comment (incorrect documentation)** — The comment above `js.Consumer(ctx, stream, consumer)` said "Get or create the consumer". `jetstream.JetStream.Consumer` only retrieves an existing consumer and returns an error if it does not exist. Rewrote the comment to clarify that the lookup requires an existing consumer and pointed at `js.CreateOrUpdateConsumer` as the create path.

3. **Confusing `Nak()` comment (clarity fix)** — The original comment claimed "WithDelay adds backoff before redelivery" but the code only called `msg.Nak()`. Reworded to say that `msg.NakWithDelay(duration)` is the option to use when backoff is wanted, which matches the JetStream API.

## Review Notes
- `Channel.Publish` is not deprecated in amqp091-go; `PublishWithContext` is the recommended context-aware variant for new code but `Publish` is still part of the supported API, so the `processWithRetry` example was left unchanged.
- `Channel.Consume` likewise has a context-aware sibling (`ConsumeWithContext`) added in newer versions, but `Consume` itself is still supported.
- The retry example re-publishes failed messages to the same queue with an `x-retry-count` header and immediately acks the original. This works but does not add an actual delay between attempts — readers wanting backoff would need a delayed-message exchange / TTL-based retry queue. Acceptable for an introductory pattern.
- Header retrieval uses `int32` type assertion (`msg.Headers["x-retry-count"].(int32)`). AMQP 0-9-1 long-int headers decode to `int32` in amqp091-go, so this is correct as long as headers are always written as `int32` (which the example does).
- The Prometheus example uses `promauto.NewCounterVec` / `NewHistogram`, which register against `prometheus.DefaultRegisterer`. Correct for the default `/metrics` exporter; readers using a custom registry would need to switch to `prometheus.NewCounterVec` and explicitly register.
- The graceful-shutdown sequence (close `done` channel → `channel.Cancel` → `channel.Close` → `conn.Close`) is the canonical order for amqp091-go.
- The NATS example’s `import` block lists `os`, `os/signal`, `syscall`, but those packages are not used inside the shown snippet. They are presumably for a `main` that the reader supplies; not technically wrong for an excerpt but would fail `go build` as-is.
