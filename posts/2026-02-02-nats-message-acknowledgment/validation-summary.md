# Validation Summary: How to Implement Message Acknowledgment in NATS

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- NATS JetStream
- nats.js (Node.js client) — JetStream API (`jsm.streams.add`, `jsm.consumers.add`, pull consumer `fetch`, `msg.ack`/`nak`/`working`/`term`)
- nats.go (Go client) — `jetstream` package (`CreateOrUpdateStream`, `CreateOrUpdateConsumer`, `Fetch`, `Ack`/`NakWithDelay`/`InProgress`/`Term`)
- prom-client (Prometheus metrics in Node.js)
- Dead letter queue pattern via republishing to a `*.deadletter` subject

## Sources Consulted
- nats.js JetStream source — `jetstream/src/jsmsg.ts` (https://github.com/nats-io/nats.js/blob/main/jetstream/src/jsmsg.ts) for the `DeliveryInfo` field naming
- nats.js JetStream README (https://github.com/nats-io/nats.js/blob/main/jetstream/README.md)
- nats.go `jetstream` package API conventions (`StreamConfig`, `ConsumerConfig`, `Msg` interface, `MsgMetadata.NumDelivered`)
- NATS protocol ACK reply-subject format (`$JS.ACK.<...>.<num_delivered>.<...>`) — first delivery has `num_delivered = 1`

## Issues Found

1. **Wrong `JsMsg.info` property name (`redeliveryCount` → `deliveryCount`).** The post repeatedly read `msg.info.redeliveryCount`, but the actual field on `DeliveryInfo` in nats.js is `deliveryCount`. Confirmed via the current `jetstream/src/jsmsg.ts`, where `parseInfo` sets `di.deliveryCount = parseInt(tokens[6], 10)` and `di.redelivered = di.deliveryCount > 1`. Fixed in all four JavaScript locations (`termConsumer`, `publishToDeadLetter`, `handleError` in `OrderConsumer`, `publishToDeadLetter` in `OrderConsumer`, and `processWithMetrics` in `InstrumentedConsumer`).

2. **Off-by-one semantics around delivery count.** `deliveryCount` is 1-indexed (1 on first delivery, matching the Go `MsgMetadata.NumDelivered` shown in the same post). The post's arithmetic assumed 0-indexed semantics — `${redeliveries + 1}` for display, `redeliveries >= 4` for terminating at `max_deliver: 5`, `Math.pow(2, redeliveries)` for backoff starting at 2× base, and `messageInfo.redeliveryCount + 1` when writing the DLQ count. Updated to: `${deliveryCount}` for display, `deliveryCount >= 5` (and `deliveryCount >= this.maxRetries`) for the terminal threshold, `Math.pow(2, deliveryCount - 1)` for backoff, and `messageInfo.deliveryCount` (no `+1`) for the DLQ count. Net effect: the JS code now matches the Go code's semantics in the same post and aligns with how the protocol numbers deliveries.

3. **Unused `fmt` import in the Go snippet.** The Go program imported `"fmt"` but never referenced it; this is a compile-time error in Go (`imported and not used`). Removed the import.

## Review Notes
- Stream/consumer config field names (`max_msgs`, `max_bytes`, `max_age`, `duplicate_window`, `durable_name`, `ack_policy`, `ack_wait`, `max_deliver`, `deliver_policy`, `max_ack_pending`) and durations expressed in nanoseconds (e.g., `30 * 1e9`) match the wire/JSON shape that nats.js sends to the server.
- Go `StreamConfig` uses `Duplicates time.Duration` (mapped to `duplicate_window` on the wire) — the post's `Duplicates: time.Minute` is correct.
- `jetstream.Msg` methods used (`Ack`, `NakWithDelay`, `InProgress`, `Term`, `Metadata`, `Data`) all exist on the current `nats.go/jetstream` package.
- The `errors.Is(err, context.DeadlineExceeded)` check after `consumer.Fetch(...)` is defensive — in current `nats.go/jetstream`, an idle `Fetch` typically just yields an empty `Messages()` channel rather than returning that specific error, so the branch is mostly inert but harmless.
- The Node.js `OrderConsumer` example imports `StringCodec` and `AckPolicy` without using them; this is a stylistic nit, not a correctness issue, so left as-is per the "only fix technical errors" guidance.
- `Replicas: 1` in the Go stream example versus `replicas: 3` in the JS example is intentional (single-node vs clustered) and not a contradiction; no change made.
