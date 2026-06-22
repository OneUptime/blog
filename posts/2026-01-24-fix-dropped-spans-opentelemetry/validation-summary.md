# Validation Summary: How to Fix 'Dropped Spans' in OpenTelemetry

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OTLP HTTP exporter
- Collector memory limiter processor
- Collector retry and sending queue configuration

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry JavaScript NodeSDK README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- OpenTelemetry Python BatchSpanProcessor API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Protocol OTLP specification: https://opentelemetry.io/docs/specs/otlp/

## Issues Found
- The Node.js SDK example used the deprecated `spanProcessor` option. Changed it to `spanProcessors: [spanProcessor]`, which is the current NodeSDK configuration shape.
- The Python example referenced `os` and `provider` without defining them. Added the missing `os` import, created a `TracerProvider`, and registered it before adding the batch span processor.
- The Collector memory limiter example described `spike_limit_mib` as the soft limit. Corrected the comments to explain that `limit_mib` is the hard limit target and the soft limit is `limit_mib - spike_limit_mib`.
- The Collector YAML used the deprecated `otlphttp` exporter alias. Updated examples to use the current `otlp_http` component name.
- The Collector YAML used old-style environment substitution for `ONEUPTIME_TOKEN`. Updated it to `${env:ONEUPTIME_TOKEN}`, matching current Collector documentation.
- The retry and queue example described the queue as persistent without configuring a storage extension. Reworded the comment and checklist so they no longer imply persistence unless storage is configured.
- The memory limiter Collector YAML referenced receiver and exporter components without defining them. Added minimal `otlp` receiver and `otlp_http` exporter definitions so the snippet is internally consistent.

## Review Notes
The guidance is technically sound after the fixes. Persistent queues require a configured storage extension such as `file_storage`; the post now avoids implying that `sending_queue` alone provides restart durability.
