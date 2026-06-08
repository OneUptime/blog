# Validation Summary: How to Handle Consumer Groups in NATS

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- NATS (core pub/sub) and NATS JetStream
- nats.go (Go client)
- nats.js (Node.js client, newer `js.consumers.get(...).consume()` API)
- nats-py (Python client)
- Kubernetes Deployments and HorizontalPodAutoscaler (autoscaling/v2)
- Prometheus client_golang
- Mermaid diagrams

## Sources Consulted
- NATS JetStream concepts: https://docs.nats.io/nats-concepts/jetstream
- JetStream model deep dive: https://docs.nats.io/using-nats/developer/develop_jetstream/model_deep_dive
- Consumers documentation: https://docs.nats.io/nats-concepts/jetstream/consumers
- Streams documentation: https://docs.nats.io/nats-concepts/jetstream/streams
- NATS by Example — Queue Push Consumer (Go): https://natsbyexample.com/examples/jetstream/queue-push-consumer/go/
- NATS by Example — Pull Consumer (Go): https://natsbyexample.com/examples/jetstream/pull-consumer/go/
- NATS by Example — WorkQueue Stream: https://natsbyexample.com/examples/jetstream/workqueue-stream/go
- nats.go API reference: https://pkg.go.dev/github.com/nats-io/nats.go

## Issues Found

1. **"Exactly-once delivery" claim was inaccurate.** JetStream provides at-least-once delivery by default; exactly-once is opt-in and requires both publisher-side `Nats-Msg-Id` deduplication and consumer double-acks. Reworded the JetStream intro to state at-least-once delivery with optional exactly-once semantics.

2. **`createConsumerGroup` (push consumer for `js.QueueSubscribe`) was missing `DeliverSubject`.** A push consumer used as a queue group requires both `DeliverSubject` and `DeliverGroup`; without `DeliverSubject` the consumer is a pull consumer, and binding to it from `js.QueueSubscribe` would fail. Added `DeliverSubject: "deliver.order-processors"`.

3. **`createConsumerWithBackoff` had the same DeliverGroup-without-DeliverSubject issue.** Added `DeliverSubject: "deliver.order-processor-resilient"`.

4. **`createPullConsumer` set `DeliverGroup` on a pull consumer.** `DeliverGroup` is push-only and is invalid on pull consumers. Removed the field and added a comment explaining that pull "queue group" behavior comes from multiple workers attaching to the same durable consumer.

5. **`js.PullSubscribe("orders.>", "order-batch-processor", nats.Bind(...))` mixed durable name and Bind.** These are alternative attachment modes per the nats.go API; passing both is invalid. Changed the second argument to `""` so attachment uses `nats.Bind` alone.

6. **Missing `fmt` import in the pull-consumer example.** `fmt.Sprintf("worker-%d", i)` is used in `main`. Added `"fmt"` to the import block.

7. **Missing `fmt` import in the retry example.** `fmt.Errorf(...)` is used in `processOrderWithErrors`. Added `"fmt"` to the import block.

## Review Notes

- The Node.js sample uses the newer `@nats-io` consumer API (`js.consumers.get(...).consume()`), which is the current recommended approach. Imported `DeliverPolicy` is unused but harmless.
- The Python sample similarly imports `DeliverPolicy` without using it; not technically wrong, just dead.
- `Retention: nats.WorkQueuePolicy` is compatible with multiple consumers as long as their filter subjects are disjoint. The post uses a single shared consumer across workers, which is the canonical pattern, so no change needed — but readers should be aware that adding a second consumer with overlapping filters on a WorkQueue stream will fail.
- The "Best Practices" snippet under "Use Meaningful Consumer Names" shows partial config (just `Durable` and `DeliverGroup`). Left as-is because it's an illustrative fragment, not runnable code.
- The Go examples that reference `Order` and `processOrder` across separately-shown code blocks assume the reader treats them as a single program; this is a stylistic convention rather than a technical error.
