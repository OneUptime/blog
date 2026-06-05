# Validation Summary: How to Configure the Sentry Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Sentry exporter
- OpenTelemetry Collector processors: batch, memory_limiter, filter, attributes, resource, transform, tail_sampling, probabilistic_sampler, k8sattributes
- OpenTelemetry Collector exporter helper queues and persistent queues
- Sentry error tracking and performance monitoring
- Kubernetes metadata enrichment

## Sources Consulted
- OpenTelemetry Collector exporter component list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Contrib Sentry exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/sentryexporter
- OpenTelemetry Collector Contrib Sentry exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/sentryexporter/config.go
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector Contrib OTTL span context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/contexts/ottlspan
- OpenTelemetry Collector Contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Collector exporterhelper persistent queue documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/exporterhelper
- OpenTelemetry Collector Contrib file storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/storage/filestorage
- Sentry OpenTelemetry documentation: https://docs.sentry.io/platforms/javascript/guides/node/opentelemetry/

## Issues Found
- The post used the old DSN-style Sentry exporter configuration (`dsn`, `environment`, and `release`). Current OpenTelemetry Collector Contrib `sentryexporter` requires `url`, `org_slug`, and `auth_token`, with optional built-in project routing. Updated all exporter examples accordingly.
- The post described DSN-based routing to Sentry projects. Current exporter routing uses a resource attribute, defaulting to `service.name`, and optional `attribute_to_project_mapping`. Updated the integration explanation and multi-project example.
- The filter processor examples used deprecated nested `traces.span` syntax and the conditions were inverted: matching filter conditions are dropped, not kept. Replaced them with current `trace_conditions` examples that drop non-error/non-slow spans.
- Removed `retry_on_failure` from Sentry exporter examples because the current Sentry exporter config does not expose exporterhelper retry settings and documents retry limitations for multi-project batches.
- Removed unsupported Sentry exporter fields including `enable_release_health`. Clarified that the collector can preserve release/session attributes, but Sentry release-health sessions normally come from Sentry SDKs.
- Replaced invalid `duration_ms` OTTL expressions with supported span time comparisons such as `(span.end_time - span.start_time) > Duration("1s")`.
- Updated persistent queue configuration from the unsupported `persistent_storage` field to current `sending_queue.storage`.
- Updated HTTP semantic attributes from older names such as `http.target` to current examples using `http.route`, `http.request.method`, and `http.response.status_code`.
- Removed the routing processor example and replaced it with the Sentry exporter's native routing configuration.

## Review Notes
The Sentry exporter is currently alpha for traces and logs in OpenTelemetry Collector Contrib. The post now reflects the current exporter model, but readers should still check the exporter README for changes before deploying because alpha components can change configuration or behavior between Collector releases.
