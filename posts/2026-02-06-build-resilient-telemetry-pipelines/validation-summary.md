# Validation Summary: How to Build Resilient Telemetry Pipelines with the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector processors
- OpenTelemetry Collector exporters
- OpenTelemetry Collector extensions
- Collector internal telemetry
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector retry configuration source: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configretry/backoff.go
- OpenTelemetry Collector Contrib load balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector Contrib health check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md

## Issues Found
- The memory limiter comments described `limit_percentage` as a drop threshold and `spike_limit_percentage` as a percentage above the soft limit. Updated the comments to match the documented hard-limit and spike-reservation behavior.
- The retry section stated that every exporter supports configurable retry behavior. Updated this to say most production exporters support retry through the Collector exporter helper, avoiding an overbroad claim.
- The sending queue comments incorrectly described `num_consumers` as the number of batches kept in the queue. Updated the comments so `num_consumers` is the number of dequeue consumers and `queue_size` is the queue capacity.
- The multi-tier example used the deprecated `loadbalancing` exporter name. Updated it to the current `load_balancing` exporter name.
- The health monitoring snippet used `check_collector_pipeline`, which the official health check extension README warns is not working as expected and recommends not using. Removed that configuration from the example.
- The health monitoring snippet used `service.telemetry.metrics.address`, which current internal telemetry docs say is ignored as of Collector v0.123.0. Replaced it with the current Prometheus pull reader configuration.
- The alert table referenced `otelcol_exporter_send_failed_requests`, which is not the current per-signal metric naming. Replaced it with `otelcol_exporter_send_failed_spans`, `otelcol_exporter_send_failed_metric_points`, and `otelcol_exporter_send_failed_log_records`.
- The alert table described refused spans as dropped data. Updated the wording to say a pipeline component is refusing trace data, which matches the Collector's backpressure behavior.

## Review Notes
The configuration examples are generally accurate for current Collector releases, but several components mentioned in the post have stability levels below stable depending on signal and distribution. The load balancing exporter is available in contrib and k8s distributions, not the core distribution.
