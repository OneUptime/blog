# Validation Summary: How to Run Quickwit in Docker for Log Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Quickwit
- Docker
- Docker Compose
- OpenTelemetry Collector
- MinIO
- Amazon S3-compatible object storage
- Elasticsearch-compatible search API
- Grafana
- curl
- YAML

## Sources Consulted
- Quickwit Quickstart documentation: https://quickwit.io/docs/get-started/quickstart
- Quickwit REST API reference: https://quickwit.io/docs/reference/rest-api
- Quickwit Elasticsearch-compatible API reference: https://quickwit.io/docs/reference/es_compatible_api
- Quickwit index configuration reference: https://quickwit.io/docs/configuration/index-config
- Quickwit node configuration reference: https://quickwit.io/docs/configuration/node-config
- Quickwit storage configuration reference: https://quickwit.io/docs/configuration/storage-config
- Quickwit OpenTelemetry service documentation: https://quickwit.io/docs/log-management/otel-service
- Quickwit example node configuration: https://github.com/quickwit-oss/quickwit/blob/main/config/quickwit.yaml
- Quickwit Grafana datasource releases: https://github.com/quickwit-oss/quickwit-datasource/releases/latest
- OpenTelemetry Collector OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlpexporter

## Issues Found
- The Docker Compose examples used `QW_ENABLE_OPENTELEMETRY_OTLP_EXPORTER`, which configures outgoing Quickwit telemetry rather than the incoming OTLP endpoint. Changed it to `QW_ENABLE_OTLP_ENDPOINT`, matching Quickwit's node configuration.
- The Docker Compose setup used `QW_ENABLE_JAEGER_EXPORTER`, which is not the documented Quickwit Jaeger endpoint variable. Changed it to `QW_ENABLE_JAEGER_ENDPOINT`.
- The slow-request search URL included an unencoded `>` character in the query string. Changed it to `%3E` because Quickwit's REST API requires URL parameters to be properly encoded.
- The Elasticsearch compatibility claim said tools like Kibana and Grafana work. This was too broad because Quickwit documents Elasticsearch-compatible endpoints, not full Kibana compatibility. Reworded the claim to compatible clients and integrations.
- The MinIO example used `AWS_ENDPOINT`. Quickwit documents `QW_S3_ENDPOINT` for S3-compatible endpoints and supports path-style access via `QW_S3_FORCE_PATH_STYLE_ACCESS`. Updated the environment variables accordingly.
- The Grafana datasource installation URL pointed to the older `v0.4.1` release. Updated it to the current latest release, `v0.6.0`.
- The management commands included `PUT /api/v1/indexes/app-logs/merge`, which is not present in the documented Quickwit REST API. Removed the unsupported command.

## Review Notes
Docker-based runtime validation could not be completed because Docker Hub rejected the unauthenticated image pull with a rate-limit error. The review was completed against official Quickwit documentation and the current Quickwit source configuration example.
