# Validation Summary: How to Implement Trace Context Propagation Through Kafka Messages in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Apache Kafka
- Confluent Platform Kafka container image
- Go
- segmentio/kafka-go
- OpenTelemetry tracing and propagation
- W3C Trace Context
- Grafana Tempo

## Sources Consulted
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Kafka semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- OpenTelemetry Go propagation package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry Go trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- segmentio/kafka-go official repository documentation: https://github.com/segmentio/kafka-go
- Confluent Platform 7.5 Docker configuration reference: https://docs.confluent.io/platform/7.5/installation/docker/config-reference.html
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/

## Issues Found
- The Go producer and consumer examples imported `go.opentelemetry.io/otel/propagation` without using it. Removed the unused imports so the examples compile.
- The consumer example claimed span-link propagation but extracted context as the parent of the consumer span. Updated the consumer to start a new root span with `trace.WithLinks(trace.LinkFromContext(extractedCtx))`, matching the OpenTelemetry messaging guidance for asynchronous workflows.
- Several OpenTelemetry messaging attributes used older names such as `messaging.destination`, `messaging.source`, `messaging.operation`, and `messaging.message.size`. Updated them to current Kafka semantic convention attributes including `messaging.destination.name`, `messaging.operation.name`, `messaging.operation.type`, `messaging.message.body.size`, `messaging.kafka.offset`, and `messaging.destination.partition.id`.
- The Kafka Kubernetes manifest used three replicas of `cp-kafka` with a ZooKeeper connection but did not deploy ZooKeeper or configure unique brokers. Replaced it with a single-node KRaft example using the required Confluent container environment variables and added a Kubernetes Service for clients.
- The Tempo search examples used a JSON POST body that does not match the documented `/api/search` examples. Updated them to use `curl -G` with `--data-urlencode` query parameters.
- The post wording said consumers continue the same distributed trace. Updated the wording to describe correlation with the producer span, which is more accurate for span links.

## Review Notes
- The Kafka manifest is now a single-node KRaft example suitable for a tutorial or development environment. Confluent documents combined broker/controller KRaft mode as not supported for production clusters.
- The examples assume the application has already configured an OpenTelemetry TracerProvider, TextMapPropagator, and exporter elsewhere.
