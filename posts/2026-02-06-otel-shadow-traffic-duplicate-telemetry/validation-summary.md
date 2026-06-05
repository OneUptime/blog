# Validation Summary: How to Configure Shadow Traffic in the Collector to Duplicate Telemetry to a

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver and exporter
- Collector processors: memory limiter, batch, attributes
- Collector sending queue and retry settings
- Forward connector
- Collector internal Prometheus metrics
- Linux shell commands for reloading a Collector process

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector forward connector README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/connector/forwardconnector/README.md
- OpenTelemetry Collector exporterhelper sending queue documentation: https://go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector Docker image validation using `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector:0.152.0 validate`

## Issues Found
- The production exporter used the older `${ONEUPTIME_TOKEN}` environment variable syntax. Changed it to `${env:ONEUPTIME_TOKEN}`, which is the current Collector configuration syntax.
- The first full configuration defined `batch/shadow` but did not use it in any pipeline. Removed it from the first example and added the shadow batch definition to the later tagging example where `batch/shadow` is actually used.
- The shadow exporter description implied drops were silent and could never affect production. Clarified that a full queue rejects new batches, that enqueue failures are observable, and softened the production-impact claim to focus on bounded resource use.
- The shadow exporter queue did not explicitly show the non-blocking overflow behavior. Added `block_on_overflow: false` to make the best-effort behavior clear.
- The monitoring section omitted `otelcol_exporter_enqueue_failed_spans`, which is the relevant metric when data cannot enter a full sending queue. Added it to the metrics list.
- The monitoring section did not mention that Prometheus counter names may include a `_total` suffix depending on telemetry exporter configuration. Added that caveat.
- The time-limited shadow traffic script claimed the Collector auto-reloads on config change. Replaced that with explicit `SIGHUP` reload commands for deployments that do not reload configuration automatically.

## Review Notes
The main Collector configuration was extracted from the post and validated successfully with the official OpenTelemetry Collector v0.152.0 Docker image. The later snippets are intentionally partial examples and depend on component definitions introduced earlier in the post.
