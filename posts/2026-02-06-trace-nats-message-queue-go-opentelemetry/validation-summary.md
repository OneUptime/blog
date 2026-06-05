# Validation Summary: How to Trace NATS Message Queue Operations in Go with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- OpenTelemetry Go SDK
- OpenTelemetry context propagation
- OpenTelemetry messaging semantic conventions
- NATS
- NATS JetStream

## Sources Consulted
- OpenTelemetry Go propagation package: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/
- NATS Go client package documentation: https://pkg.go.dev/github.com/nats-io/nats.go
- NATS request-reply documentation: https://docs.nats.io/nats-concepts/core-nats/reqreply
- NATS JetStream model deep dive: https://docs.nats.io/using-nats/developer/develop_jetstream/model_deep_dive
- NATS draining documentation: https://docs.nats.io/using-nats/developer/receiving/drain

## Issues Found
- Several Go snippets used identifiers without importing the required packages. Added missing `time`, `encoding/json`, `codes`, `fmt`, and `otel` imports where needed, and removed an unused `time` import from the JetStream snippet.
- Messaging span examples used older attribute names such as `messaging.destination`, `messaging.source`, `messaging.operation`, `messaging.consumer.group`, and custom `message.size` fields. Updated them to current semantic convention names including `messaging.destination.name`, `messaging.operation.name`, `messaging.operation.type`, `messaging.consumer.group.name`, and `messaging.message.body.size`.
- The JetStream section stated exactly-once delivery too broadly. Updated the explanation to match NATS documentation: exactly-once semantics require message deduplication plus double acknowledgements.
- The JetStream example did not show the required deduplication and double-ack pieces for exactly-once semantics. Added `nats.MsgIdHdr` using the order ID and changed final acknowledgement from `Ack()` to `AckSync()` with error handling.
- The queue consumer shutdown example did not actually stop the subscription before waiting for in-flight goroutines. Stored the subscription returned by `QueueSubscribe` and called `Drain()` during shutdown.
- The queue consumer span hardcoded the consumer group attribute as `order-processors` instead of using the `queueGroup` argument. Passed the queue group through to `processMessage` and used it in `messaging.consumer.group.name`.

## Review Notes
Go was not installed in the review environment, so I could not run `go test` or compile the snippets locally. The review was performed against official API and semantic convention documentation, with text-level checks for missing imports and outdated attribute names.
