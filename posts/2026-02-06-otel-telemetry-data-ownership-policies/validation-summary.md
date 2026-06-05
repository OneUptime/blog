# Validation Summary: How to Define Cross-Team Telemetry Data Ownership Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry resource attributes
- OpenTelemetry semantic conventions
- OpenTelemetry Python SDK
- OpenTelemetry Collector resource processor
- OpenTelemetry Collector routing connector
- Kubernetes Deployments
- Prometheus/PromQL
- SQL cost attribution queries

## Sources Consulted
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry resource SDK specification: https://opentelemetry.io/docs/specs/otel/resource/sdk/
- OpenTelemetry resources concept documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Python Resource documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Collector resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector routing processor deprecation notice: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/routingprocessor/README.md
- OpenTelemetry Collector routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post presented custom attributes such as `service.team`, `service.cost_center`, and `service.oncall` as if they were all standard OpenTelemetry attributes. Clarified that `service.name` and `service.namespace` are semantic convention attributes and the ownership fields are organization-specific resource attributes.
- The Python `Resource.create` example passed environment variables directly, which could include `None` values when variables are unset. Updated the example to filter unset values before creating the resource.
- The Kubernetes `apps/v1` Deployment snippet omitted the required selector and pod template labels. Added `spec.selector.matchLabels` and `spec.template.metadata.labels`.
- The Collector resource processor used `upsert` while the text said defaults were added only when attributes were missing. Changed the actions to `insert` so existing ownership values are preserved.
- The Collector routing example used the deprecated routing processor. Replaced it with the current routing connector pattern, including connector, exporter, and service pipeline configuration.
- The PromQL example grouped `otelcol_receiver_accepted_spans_total` by `service_team`, but Collector receiver self-metrics report receiver ingestion volume and do not preserve service resource attributes for per-team cost attribution. Reworded the guidance and replaced the query with a generic backend/span-metrics ingestion counter example.

## Review Notes
The ownership policy itself is organizational guidance, so enforcement details such as budgets, escalation timelines, and sampling thresholds are valid as examples but still require environment-specific Collector and backend configuration.
