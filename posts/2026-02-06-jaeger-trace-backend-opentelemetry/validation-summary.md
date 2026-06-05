# Validation Summary: How to Set Up Jaeger as a Trace Backend for OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Jaeger
- OpenTelemetry
- OpenTelemetry Collector
- OTLP gRPC and OTLP HTTP
- Python OpenTelemetry SDK
- Docker and Docker Compose
- Kubernetes
- Helm
- Elasticsearch

## Sources Consulted
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Jaeger CLI flags documentation: https://www.jaegertracing.io/docs/1.76/deployment/cli/
- Jaeger features documentation for OTLP and storage backend support: https://jaeger.website.cncfstack.com/docs/1.63/features/
- Jaeger Elasticsearch/index cleaner documentation: https://www.jaegertracing.io/docs/2.dev/storage/elasticsearch/
- Jaeger es-index-cleaner package documentation: https://pkg.go.dev/github.com/jaegertracing/jaeger/cmd/es-index-cleaner
- Jaeger Helm charts repository: https://github.com/jaegertracing/helm-charts
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector tail sampling documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector OTLP exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlpexporter

## Issues Found
- The quick-start Docker command exposed port 9411 and described it as the Zipkin receiver, but Jaeger's Zipkin collector is disabled by default. Added `COLLECTOR_ZIPKIN_HOST_PORT=:9411`. Also added `COLLECTOR_OTLP_ENABLED=true` to make OTLP enablement explicit for the versioned Jaeger v1 all-in-one command.
- The opening text said native OTLP support was added in "recent versions." Updated this to the specific Jaeger v1.35 support point.
- The Python OTLP exporter endpoint omitted the URL scheme. The OTLP gRPC spec allows host:port endpoints, but the official Python example uses `http://localhost:4317`; updated the snippet to match current documented usage.
- The production storage description grouped Badger with distributed production storage backends. Clarified that Elasticsearch, OpenSearch, and Cassandra are distributed storage backends, while Badger is embedded single-node storage.
- The Docker Compose query service mapped port 16687 but labeled it as the Jaeger Query API. Port 16687 is the admin endpoint; corrected the comment.
- The `jaeger-es-index-cleaner` examples used `ES_SERVER_URLS` and omitted the required positional Elasticsearch URL. Updated the Docker and Kubernetes examples to pass `http://elasticsearch:9200` as an argument and kept `ROLLOVER=true` as the environment setting.
- The Jaeger collector tuning example used `COLLECTOR_OTLP_GRPC_MAX_RECV_MSG_SIZE_MIB`, which does not match the documented flag-derived environment variable. Replaced it with `COLLECTOR_OTLP_GRPC_MAX_MESSAGE_SIZE=33554432`.

## Review Notes
The OpenTelemetry Collector config is syntactically consistent with contrib Collector components, including `tail_sampling`, `memory_limiter`, `resource`, `batch`, `retry_on_failure`, and `sending_queue`. The Kubernetes DaemonSet example assumes a matching `otel-collector-config` ConfigMap exists; that is acceptable for the snippet but should be included in a full production manifest.
