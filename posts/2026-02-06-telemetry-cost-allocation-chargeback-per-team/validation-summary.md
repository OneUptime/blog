# Validation Summary: How to Use Telemetry Cost Allocation and Chargeback per Team with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK resource attributes
- OpenTelemetry Python SDK
- OpenTelemetry Operator Instrumentation CRD
- OpenTelemetry Collector
- OpenTelemetry Collector count connector
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector groupbyattrs processor
- OpenTelemetry Collector Prometheus exporter
- Prometheus / PromQL
- Kubernetes

## Sources Consulted
- OpenTelemetry Python SDK resources documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Operator Instrumentation API source: https://github.com/open-telemetry/opentelemetry-operator/blob/main/apis/v1alpha1/instrumentation_types.go
- OpenTelemetry Collector count connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md
- OpenTelemetry Collector count connector configuration source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/config.go
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector groupbyattrs processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbyattrsprocessor/README.md
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Collector Prometheus translation documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/translator/prometheus/README.md

## Issues Found
- The Python resource example only passed the resource to `TracerProvider`, even though the text says logs, metrics, and traces should carry the team metadata. Updated the example to pass the same resource to `TracerProvider`, `MeterProvider`, and `LoggerProvider`.
- The Operator example said the `Instrumentation` resource injects metadata into all pods matching a namespace selector, but the shown CRD does not define a namespace selector. Updated the comment to say workloads must opt in to Python auto-instrumentation.
- The Collector section said the `routing` connector with the `count` connector can measure bytes per team. The official count connector counts spans, span events, metrics, data points, log records, and profiles; it does not measure bytes. Updated the wording to telemetry counts.
- The Collector section introduced the `transform` processor for estimated sizes, but the provided configuration did not use it and the count connector is the component actually producing metrics. Updated the text to describe the count connector.
- The count connector configuration only counted spans and logs while the prose said spans, metrics, and logs. Added `datapoints` counting and a `metrics/ingest` pipeline.
- The span count included a condition requiring `team.name`, which would prevent the configured `default_value: unattributed` from counting spans without ownership metadata. Removed that condition.
- The PromQL query did not explicitly aggregate by team. Updated it to `sum by (team_name)` to match the Prometheus exporter's normalization of `team.name` to `team_name`.

## Review Notes
The count connector and routing connector are alpha Collector components, so future Collector releases may require syntax or behavior updates. The `team.name` and `team.cost-center` attributes are custom resource attributes rather than OpenTelemetry semantic convention attributes, which is acceptable for organization-specific chargeback metadata.
