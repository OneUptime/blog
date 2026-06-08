# Validation Summary: How to Build NATS Consumers

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- NATS JetStream
- Go (`github.com/nats-io/nats.go` and `github.com/nats-io/nats.go/jetstream` v2 API)
- Node.js (`nats` / nats.js library)
- Push and Pull consumers
- Delivery policies (DeliverAll, DeliverNew, DeliverLast, DeliverByStartSequence, DeliverByStartTime)
- Acknowledgment strategies (Ack, Nak, NakWithDelay, Term)
- Dead Letter Queue patterns
- Consumer groups / queue group load balancing
- Consumer monitoring via `ConsumerInfo`

## Sources Consulted
- nats.go jetstream package source — `consumer_config.go` (ConsumerInfo and SequenceInfo struct field types): https://github.com/nats-io/nats.go/blob/main/jetstream/consumer_config.go
- nats.go jetstream package consumer implementation: https://github.com/nats-io/nats.go/blob/main/jetstream/consumer.go
- nats.go jetstream stream_config.go (StreamConfig, StreamInfo): https://github.com/nats-io/nats.go/blob/main/jetstream/stream_config.go
- nats.js jetstream JsMsg / DeliveryInfo interface: https://github.com/nats-io/nats.js/blob/main/jetstream/src/jsmsg.ts

## Issues Found

1. **Type mismatch in `ConsumerHealth` struct (Go health check example).**
   - Was: `NumRedelivered uint64`
   - Issue: `ConsumerInfo.NumRedelivered` in the jetstream package is declared as `int`, not `uint64`. The struct as written would cause a Go compilation error when assigning `info.NumRedelivered` to `health.NumRedelivered`.
   - Fix: Changed to `NumRedelivered int` to match the actual `ConsumerInfo` field type.

2. **Incorrect property name in Node.js DLQ example.**
   - Was: `info.redeliveryCount >= 3`
   - Issue: The nats.js `JsMsg.info` (`DeliveryInfo`) object exposes the delivery count as `deliveryCount`, not `redeliveryCount`. `redelivered` exists as a boolean (`deliveryCount > 1`), but no `redeliveryCount` field exists. Using the wrong name would always evaluate to `undefined >= 3 === false`, silently disabling the DLQ branch.
   - Fix: Changed to `info.deliveryCount >= 3`. Semantics remain consistent with the Go example's `metadata.NumDelivered >= 3` check.

## Review Notes
- The post correctly uses the newer `github.com/nats-io/nats.go/jetstream` API (v2) and accurately notes that push consumers created via this API are consumed using the legacy core NATS subscription pattern (`nc.QueueSubscribe`), which is the intended pattern.
- All `ConsumerConfig` and `StreamConfig` field names (Name, Durable, DeliverSubject, DeliverGroup, AckPolicy, AckWait, MaxDeliver, FilterSubject, MaxAckPending, DeliverPolicy, OptStartSeq, OptStartTime, Replicas, Discard, Retention, MaxAge, Storage) are valid.
- All delivery policy constants (`DeliverAllPolicy`, `DeliverNewPolicy`, `DeliverLastPolicy`, `DeliverByStartSequencePolicy`, `DeliverByStartTimePolicy`) and storage/retention constants (`FileStorage`, `LimitsPolicy`, `DiscardOld`) are correctly named.
- Msg methods (`Ack`, `Nak`, `NakWithDelay`, `Term`, `Metadata`, `Data`, `Subject`) and metadata fields (`NumDelivered`, `Consumer`) are accurate.
- `Consumer.Consume` with `jetstream.ConsumeErrHandler` is the correct callback-based API.
- The Node.js example correctly uses nanoseconds for `max_age` and `ack_wait`, matches snake_case JSON field names (`durable_name`, `ack_policy`, `filter_subject`, etc.), and uses the v3 `consumer.fetch({expires, max_messages})` API.
- `Replicas: 3` in the stream example only works on a clustered NATS deployment of at least 3 servers; it will fail against the single `nats://localhost:4222` server shown. Not strictly incorrect (the field/value are valid) but a runtime caveat readers should be aware of.
- The health check divides by `info.Delivered.Consumer` without guarding against zero, which could produce `NaN`/`+Inf` on a brand-new consumer. Not a bug per se, but a minor robustness improvement future readers could make.
- `DeliverPolicy` is imported in the Node.js example but never referenced; harmless but unused.
