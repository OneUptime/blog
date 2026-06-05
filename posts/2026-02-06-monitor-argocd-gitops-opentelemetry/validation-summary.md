# Validation Summary: How to Monitor ArgoCD GitOps Deployments with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- OpenTelemetry Collector
- Prometheus metrics
- Kubernetes
- Argo CD Notifications
- Python Flask
- OpenTelemetry Python SDK
- Prometheus alerting rules

## Sources Consulted
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notification subscriptions documentation: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/subscriptions/
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector resource processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourceprocessor
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html

## Issues Found
- Corrected the sync process explanation. Argo CD does not automatically start a sync merely because it detects a Git change unless automated sync is enabled or a user starts a sync manually.
- Escaped Prometheus relabel replacement variables from `$1` to `$$1` in the OpenTelemetry Collector configuration. Collector configuration expansion treats `$` specially, so literal Prometheus replacement variables must be escaped.
- Replaced non-existent standalone `argocd_app_health_status` and `argocd_app_sync_status` metric references with `argocd_app_info` label-based queries using `health_status` and `sync_status`.
- Replaced the unsupported `argocd_repo_server_render_duration_seconds` metric with the documented `argocd_repo_parallelism_wait_duration_seconds` metric.
- Adjusted the `argocd_app_sync_total` description and alert query to match documented sync operation phase labels.
- Updated Argo CD notification triggers to use optional chaining for `operationState`, matching official examples and avoiding trigger evaluation failures when `operationState` is absent.
- Added a global notification subscription so the webhook service, triggers, and templates actually emit events for applications.
- Fixed the Python trace bridge by removing unused deterministic trace ID code, making the OTLP gRPC exporter explicitly insecure for in-cluster plaintext Collector traffic, and using Argo CD notification timestamps as span start and end times.
- Corrected the deployment context Collector example to use Collector environment variable expansion with `value: ${env:DEPLOYMENT_VERSION}` instead of `from_attribute`, which copies from an existing resource attribute rather than reading an environment variable.

## Review Notes
The trace bridge remains a lightweight illustrative service. In production it should also handle restarts, duplicate notifications, authentication, input validation, and persistent state for active syncs.
