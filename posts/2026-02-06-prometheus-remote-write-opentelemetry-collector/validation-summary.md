# Validation Summary: How to Use Prometheus Remote Write with the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- Prometheus Remote Write
- Prometheus Remote Write 2.0
- OTLP metrics
- Prometheus-compatible metric backends, including Cortex, Thanos, and Grafana Mimir
- OpenTelemetry Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector Contrib Prometheus Remote Write Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusremotewritereceiver/README.md
- OpenTelemetry Collector Contrib Prometheus Remote Write Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Prometheus remote write configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write
- Prometheus Remote Write 2.0 specification: https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/
- Prometheus metadata WAL records feature flag documentation: https://prometheus.io/docs/prometheus/latest/feature_flags/#metadata-wal-records
- Grafana Mimir authentication and authorization documentation: https://grafana.com/docs/mimir/latest/manage/secure/authentication-and-authorization/
- Cortex user overrides API documentation, showing `X-Scope-OrgID` tenant authentication: https://cortexmetrics.io/docs/guides/overrides/
- Thanos high availability and deduplication documentation: https://thanos.io/v0.6/thanos/getting-started.md/

## Issues Found
- The post used the deprecated Collector component type `prometheusremotewrite`. Updated receiver and exporter examples to the current `prometheus_remote_write` component type.
- The receiving example used `/api/v1/push`, but the Collector remote write receiver registers `/api/v1/write`. Updated the Prometheus remote write URL accordingly.
- The receiving example did not configure Prometheus for Remote Write 2.0. Added `protobuf_message: io.prometheus.write.v2.Request` and noted the required `--enable-feature=metadata-wal-records` Prometheus flag.
- The exporter examples used `sending_queue`, but the Prometheus remote write exporter uses `remote_write_queue`. Updated both examples.
- The exporter configuration used deprecated `add_metric_suffixes`. Replaced it with `translation_strategy: UnderscoreEscapingWithSuffixes`.
- The text said `external_labels` are used for Cortex/Mimir tenant identification. Corrected this to explain that Mimir/Cortex tenancy is normally carried in the `X-Scope-OrgID` header.
- The conversion section omitted the exporter limitation for non-cumulative monotonic, histogram, and summary OTLP metrics. Added that these are dropped by the exporter.
- The WAL section overstated high availability and loss guarantees. Reworded it as durability that minimizes loss and persists queued metrics across restarts.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Updated it to use a Prometheus pull reader with `host` and `port`.
- The Prometheus config comment incorrectly described `metadata_config` as retry behavior. Corrected the comment to describe metadata behavior.

## Review Notes
The receiver side is version-sensitive because the current Collector contrib receiver focuses on Prometheus Remote Write 2.0, and Collector/Prometheus compatibility can change with Remote Write 2.0 spec revisions. The exporter side is beta and currently still documents Remote Write 2.0 sending as feature-gated/in development, so examples keep the default Remote Write 1.0 exporter behavior unless explicitly configured otherwise.
