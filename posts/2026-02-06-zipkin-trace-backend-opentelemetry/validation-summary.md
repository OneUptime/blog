# Validation Summary: How to Set Up Zipkin as a Trace Backend for OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Zipkin
- Docker
- Docker Compose
- Elasticsearch
- Cassandra
- MySQL
- Python OpenTelemetry SDK
- Tail sampling

## Sources Consulted
- Zipkin server README and configuration docs: https://github.com/openzipkin/zipkin/blob/master/zipkin-server/README.md
- Zipkin architecture docs: https://zipkin.io/pages/architecture.html
- OpenTelemetry Collector Zipkin exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/zipkinexporter/README.md
- OpenTelemetry Collector OTLP receiver docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector batch processor docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector memory limiter processor docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector tail sampling processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- Elasticsearch Docker installation docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html

## Issues Found
- The Docker Compose example used `elasticsearch:8.12.0`, while Elastic's official Docker documentation uses images from `docker.elastic.co/elasticsearch/elasticsearch`. Updated the image to `docker.elastic.co/elasticsearch/elasticsearch:8.12.0`.
- The post described Zipkin's persistent storage choices as Elasticsearch, Cassandra, and MySQL without noting that Zipkin documents MySQL as a legacy v1 storage component that is not recommended for production. Updated the deployment and storage-backend text to preserve MySQL as available but clarify the production caveat.
- The verification instructions pointed users to `http://localhost:9411`. Zipkin's own quick-start and UI documentation use the `/zipkin` UI path, so the verification URL was updated to `http://localhost:9411/zipkin`.

## Review Notes
The OpenTelemetry Collector snippets use valid component names and fields for the OTLP receiver, memory limiter, batch processor, Zipkin exporter, debug exporter, and tail sampling policies. The Python example uses the current OpenTelemetry Python SDK and OTLP gRPC exporter APIs. For a future production-focused revision, the post could add a complete Collector service telemetry block for Prometheus scraping and explain that the tail-sampling processor must be included in the trace pipeline after context-dependent processors and before batching.
