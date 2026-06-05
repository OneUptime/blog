# Validation Summary: How to Instrument Go MQTT Clients with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Eclipse Paho MQTT Go client
- MQTT 3.1.1 and MQTT 5 trace-context considerations
- OpenTelemetry Go SDK
- OpenTelemetry trace propagation
- OpenTelemetry messaging semantic conventions
- OTLP trace export over gRPC

## Sources Consulted
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/
- OpenTelemetry messaging span conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Go propagation package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry Go OTLP trace gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry semantic conventions Go package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.21.0
- Eclipse Paho MQTT Go package documentation: https://pkg.go.dev/github.com/eclipse/paho.mqtt.golang
- W3C Trace Context: MQTT protocol draft: https://w3c.github.io/trace-context-mqtt/
- OASIS MQTT Version 5.0 specification: https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html
- OASIS MQTT Version 3.1.1 specification: https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/cos01/mqtt-v3.1.1-cos01.html

## Issues Found
- The post described trace propagation through generic message headers and trace links. The Paho package used in the examples is an MQTT 3.1.1 client, and MQTT 3.1.1 does not have MQTT 5 user properties. I changed the prose to say this example embeds trace context in the payload for MQTT 3.1.1 clients, while MQTT 5 clients can use user properties.
- Several OpenTelemetry messaging attributes used older or non-current names, including `messaging.destination`, `messaging.operation`, `messaging.message_id`, `messaging.message.payload_size_bytes`, and `messaging.batch.count`. I updated the snippets to current convention names such as `messaging.destination.name`, `messaging.operation.name`, `messaging.operation.type`, `messaging.message.id`, `messaging.message.body.size`, and `messaging.batch.message_count`.
- Messaging span names used an `mqtt.` prefix. I updated the message-operation spans to use operation plus destination names, matching OpenTelemetry messaging span-name guidance.
- The examples set `error.message` attributes but did not mark spans as failed according to OpenTelemetry Go guidance. I added `recordSpanError`, which records the error, sets span status to `codes.Error`, and sets `error.type`.
- The client ID attribute used `messaging.client_id`, which is not the current messaging semantic convention key. I updated it to `messaging.client.id`.
- The connection span used the full broker URL as `server.address`. I added a helper that parses the broker URL and emits `server.address` and `server.port` correctly.
- The subscribe and unsubscribe spans were modeled as consumer spans even though they are client-side control operations. I changed them to `SpanKindClient`.
- The complete example initialized the subscriber tracer provider before constructing the publisher client, which would cause `otel.Tracer("mqtt-client")` for the publisher to be resolved after the global provider was changed. I moved publisher client creation before subscriber tracer initialization so each client uses the intended tracer provider.

## Review Notes
Go is not installed in this review environment, so I could not compile or run the assembled example. The review was performed against official API documentation and semantic convention references. The example still intentionally uses manual instrumentation and payload wrapping; a production MQTT 5 implementation should prefer standard trace-context user properties when the chosen client library supports MQTT 5.
