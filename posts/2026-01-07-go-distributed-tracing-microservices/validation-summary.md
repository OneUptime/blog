# Validation Summary: How to Implement Distributed Tracing in Go Microservices

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Go
- OpenTelemetry Go API and SDK
- OTLP trace exporter over gRPC
- W3C Trace Context and Baggage propagation
- net/http instrumentation with otelhttp
- gRPC instrumentation with otelgrpc
- Apache Kafka with Sarama
- RabbitMQ with amqp091-go
- OpenTelemetry semantic conventions
- OneUptime traces

## Sources Consulted
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Go otlptracegrpc package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go propagation package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry Go otelhttp package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- OpenTelemetry Go otelgrpc package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- gRPC Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- Sarama package documentation: https://pkg.go.dev/github.com/IBM/sarama
- RabbitMQ amqp091-go package documentation: https://pkg.go.dev/github.com/rabbitmq/amqp091-go

## Issues Found
- The tracer initialization used `otlptracegrpc.WithGRPCConn` with a manually created gRPC connection but did not close that connection. The official exporter documentation states callers are responsible for closing a connection passed with `WithGRPCConn`, so the example was changed to use `WithEndpoint` and `WithInsecure` directly.
- The semantic convention import used `go.opentelemetry.io/otel/semconv/v1.21.0`. Updated it to the current documented `v1.37.0` import path.
- The gRPC section described interceptors even though the code correctly used `grpc.StatsHandler` with `otelgrpc.NewServerHandler` and `otelgrpc.NewClientHandler`. Updated the explanation to match the current otelgrpc stats handler API.
- The Kafka and RabbitMQ snippets imported `go.opentelemetry.io/otel/propagation` without using the package name, which would cause unused-import compile errors. Removed those imports.
- The notification service initialized `kafka.TracedKafkaConsumer` by setting the unexported `tracer` field from another package, which would not compile. Added a `NewTracedKafkaConsumer` constructor in the Kafka snippet and updated the notification service to use it.
- Several examples used older semantic attribute names such as `http.status_code`, `db.system`, `db.operation`, `messaging.destination`, `messaging.source`, and `messaging.rabbitmq.routing_key`. Updated them to current semantic convention names such as `http.response.status_code`, `db.system.name`, `db.operation.name`, `messaging.destination.name`, and `messaging.rabbitmq.destination.routing_key`.
- The OTLP exporter description implied Jaeger and Zipkin were collectors for the OTLP gRPC exporter. Clarified that the exporter sends traces to an OpenTelemetry Collector or OTLP-compatible backend.

## Review Notes
The Go toolchain is not installed in this environment, so I could not compile the examples locally. The review was completed against official Go package documentation and OpenTelemetry documentation. Some code blocks remain illustrative snippets that depend on project-specific generated protobuf packages such as `yourproject/proto/order` and `yourproject/proto/inventory`.
