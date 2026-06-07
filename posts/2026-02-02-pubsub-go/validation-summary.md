# Validation Summary: How to Use Pub/Sub with Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (programming language)
- Google Cloud Pub/Sub (`cloud.google.com/go/pubsub` v1)
- Redis Pub/Sub (`github.com/redis/go-redis/v9`)
- NATS Core (`github.com/nats-io/nats.go`)
- NATS JetStream (`github.com/nats-io/nats.go/jetstream`)
- Exponential backoff / retry patterns
- Dead Letter Queue (DLQ) pattern
- Mermaid diagrams

## Sources Consulted
- Google Cloud Pub/Sub Go client documentation: https://pkg.go.dev/cloud.google.com/go/pubsub
- Google Cloud Pub/Sub exactly-once delivery docs: https://cloud.google.com/pubsub/docs/exactly-once-delivery
- Google Cloud Pub/Sub message ordering docs: https://cloud.google.com/pubsub/docs/ordering
- go-redis v9 documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- NATS Go client documentation: https://pkg.go.dev/github.com/nats-io/nats.go
- NATS JetStream new API documentation: https://pkg.go.dev/github.com/nats-io/nats.go/jetstream
- NATS.io documentation on subjects and wildcards: https://docs.nats.io/nats-concepts/subjects

## Issues Found
1. **Incorrect comment about exactly-once delivery dependency** (line 263 in original):
   - The original comment stated `// Enable exactly-once delivery (requires ordering)`.
   - This is factually incorrect. In Google Cloud Pub/Sub, `EnableExactlyOnceDelivery` and `EnableMessageOrdering` are **independent** features that can be enabled separately. Exactly-once delivery does not require message ordering to be enabled.
   - **Fix applied**: Updated the comment to `// Enable exactly-once delivery (independent from message ordering)` to accurately reflect the relationship between the two features.

## Review Notes
- The post uses the v1 `cloud.google.com/go/pubsub` library (not the newer v2 `cloud.google.com/go/pubsub/v2` package). The v1 API used in the post is still supported and all API surface area (`pubsub.NewClient`, `client.Topic`, `topic.Publish`, `client.Subscription`, `sub.Receive`, `pubsub.SubscriptionConfig` fields, `pubsub.ReceiveSettings` fields, etc.) is correct as of the review date. Readers starting new projects may want to consider the v2 package, but the v1 examples in the post are technically accurate.
- The NATS JetStream code consistently uses the modern `jetstream.New(nc)` API (rather than the legacy `nc.JetStream()` API), which is the currently recommended approach.
- The `Consume` function in the JetStream example uses a `for { select { case <-ctx.Done(): default: iter.Next() } }` pattern. Because `iter.Next()` blocks waiting for messages and the `default` branch always wins when nothing else is ready, context cancellation will only be observed once `Next()` returns. In practice the iterator will exit cleanly once `iter.Stop()` is called via `defer`, but cancellation responsiveness depends on message arrival or heartbeats. This is a design/responsiveness consideration rather than a technical inaccuracy, so no change was made.
- The custom `contains`/`containsImpl` helpers in the retry example reimplement what `strings.Contains` already does. This is stylistically unidiomatic but not incorrect.
- The `getAttemptCount` helper in the DLQ example uses `json.Unmarshal` to parse an integer from a string attribute. `strconv.Atoi` would be more idiomatic, but `json.Unmarshal` does parse a bare numeric string into an `int` correctly, so the code works as written.
- The NATS Go option names (`nats.Name`, `nats.ReconnectWait`, `nats.MaxReconnects`, `nats.PingInterval`, `nats.MaxPingsOutstanding`, `nats.DisconnectErrHandler`, `nats.ReconnectHandler`, `nats.ClosedHandler`) and the `nc.ConnectedUrl()` method are all correctly spelled.
- All Mermaid diagrams use valid syntax.
- All `go get` installation commands point to the correct module paths.
