# Validation Summary: Monitor Docker Container Metrics with the OpenTelemetry Docker Stats Receiver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Docker Stats Receiver
- Docker Engine API
- Docker Compose
- OpenTelemetry Collector processors and exporters

## Sources Consulted
- OpenTelemetry Collector Contrib Docker Stats Receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/dockerstatsreceiver
- OpenTelemetry Collector Contrib Docker Stats Receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/dockerstatsreceiver/documentation.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- Docker Engine API documentation: https://docs.docker.com/reference/api/engine/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Local validation with `otel/opentelemetry-collector-contrib:latest validate`

## Issues Found
- The basic receiver configuration pinned `api_version: 1.24`, but the current Docker Stats Receiver requires Docker API 1.25 or later and documents `api_version` as a string. Changed it to `api_version: "1.25"` and clarified that pinning is optional because the receiver can auto-negotiate.
- The prerequisites stated Docker Engine 19.03 or later. Changed this to the receiver's actual Docker API requirement, Docker API 1.25 or later.
- The metrics table listed `container.cpu.percent`, which was removed after the receiver migrated to `container.cpu.utilization`. Updated the metric name and the filter example.
- The metrics table described `container.memory.usage.total` as including cache, but the generated receiver documentation says this metric excludes cache. Corrected the description.
- The metrics table used `percent` as the unit for utilization metrics, while the generated receiver documentation uses unit `1`. Updated the listed units for CPU and memory utilization.
- The metrics table listed BlockIO metrics with `.read` and `.write` suffixes. Current receiver documentation uses `container.blockio.io_service_bytes_recursive` with an `operation` attribute such as `read` or `write`. Updated the table.
- The optional metrics example included network packet drop metrics, but current receiver documentation lists `container.network.io.usage.rx_dropped` and `container.network.io.usage.tx_dropped` as default metrics. Removed them from the optional-enable example.
- The filtering section implied the receiver can filter containers by name or label and that `container_labels_to_metric_labels` filters containers. The documented options exclude by image and copy labels or environment variables to metric attributes. Updated the explanation and comments.
- The alerting section referred to the `transform` processor, but the example used the `filter` processor. Updated the wording and snippet comment.
- The collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Replaced it with the current Prometheus pull reader configuration.
- The Docker Compose example included the legacy top-level `version: "3.8"` field. Removed it to align with the current Compose Specification.

## Review Notes
Representative Collector configurations from the post were validated with `otel/opentelemetry-collector-contrib:latest validate` after the fixes. The Docker Stats Receiver metrics are documented as development stability, so metric names and defaults should be rechecked before future updates.
