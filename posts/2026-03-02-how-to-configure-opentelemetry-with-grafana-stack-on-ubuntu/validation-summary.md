# Validation Summary: How to Configure OpenTelemetry with Grafana Stack on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Docker Engine and Docker Compose
- OpenTelemetry Collector
- Grafana Tempo
- Grafana Loki
- Grafana Mimir
- Grafana datasource and alert provisioning
- Python OpenTelemetry SDK
- Go OpenTelemetry SDK
- TraceQL, LogQL, and PromQL

## Sources Consulted
- Docker Engine Ubuntu installation documentation: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose file reference for the obsolete top-level `version` field: https://docs.docker.com/reference/compose-file/version-and-name/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporters list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Grafana Loki OTLP ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo TraceQL query documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Tempo datasource provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana trace-to-logs correlation documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- Grafana Mimir HTTP API documentation: https://grafana.com/docs/mimir/latest/references/http-api/
- Grafana alerting file provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Go OTLP trace exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc

## Issues Found
- The prerequisites listed Ubuntu 20.04, which is no longer listed in current Docker Engine Ubuntu support documentation. Updated the prerequisite to Ubuntu 22.04 or 24.04 LTS.
- The prerequisites omitted ports exposed by the Compose stack. Added 3100, 3200, and 9009.
- The Docker Compose file used the obsolete top-level `version` field. Removed it.
- The Collector used the deprecated Loki exporter path. Replaced it with `otlphttp/loki` and Loki's native OTLP endpoint.
- The Loki image was pinned to 2.9.5, which does not match the native OTLP ingestion guidance. Updated it to Loki 3.0.0.
- The Tempo config contained `search_enabled: true`, which Tempo 2.4 rejects as an unknown field. Removed the invalid key.
- The Tempo metrics-generator processors were enabled without remote-write storage, so Grafana's service map would not receive generated metrics. Added metrics-generator WAL storage and remote write to Mimir.
- Grafana datasource references used `datasourceUid: loki` and `datasourceUid: mimir` without defining matching datasource UIDs. Added explicit `uid` values.
- The trace-to-logs mapping used a Loki label name that would not match native Loki OTLP labels. Updated it to map `service.name` to `service_name` and enabled trace ID filtering.
- The Go example used `ctx` without importing `context` or defining a context value. Added the import and `ctx := context.Background()`.
- The TraceQL example used invalid resource attribute syntax. Updated it to `resource.service.name` and `trace:duration`.
- The LogQL example queried `{service="my-service"}`, which does not match Loki's native OTLP service label. Updated it to `{service_name="my-service"}`.
- The alert provisioning example omitted required fields for file-provisioned Grafana alert rules. Added a rule UID, group interval, relative time ranges, expression datasource block, no-data/error states, and a firing duration.
- The closing paragraph described the stack as production-grade even though it uses local filesystem storage and anonymous Grafana admin access. Reworded it to identify the setup as self-hosted and call out production requirements.

## Review Notes
- Validated the corrected Docker Compose file with `docker compose config --quiet`.
- Validated the corrected OpenTelemetry Collector config with `otel/opentelemetry-collector-contrib:0.96.0 validate`.
- Validated the corrected Tempo config with `grafana/tempo:2.4.0 -config.verify=true`.
- Validated the Loki 3.0.0 bundled local config with `grafana/loki:3.0.0 -verify-config=true`.
- Smoke-tested the Mimir 2.11.0 config startup path in Docker.
- Parsed the Grafana datasource and alert provisioning YAML with PyYAML.
- The local environment does not include the Go toolchain, so the Go snippet could not be compiled locally.
