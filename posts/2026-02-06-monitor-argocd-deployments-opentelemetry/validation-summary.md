# Validation Summary: How to Monitor ArgoCD Deployments with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Kubernetes
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Python SDK
- Prometheus metrics
- Flask

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notifications trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD notifications monitoring documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/monitoring/
- OpenTelemetry Collector receivers documentation: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html

## Issues Found
- The post used the non-existent Argo CD metric `argocd_app_reconcile_duration`. Updated it to the documented `argocd_app_reconcile` histogram in both the metric list and alert guidance.
- The collector section said it captured all Argo CD components but omitted the notifications controller shown in the diagram. Added a scrape job for `argocd-notifications-controller` on the documented metrics port `9001` and softened the wording to "main ArgoCD metrics endpoints."
- The Argo CD notification triggers accessed `app.status.operationState.phase` directly. Updated them to `app.status?.operationState.phase` because Argo CD documents `operationState` as optional and recommends optional chaining.
- The Python bridge imported and used `BatchSpanExporter`, which is not part of the current OpenTelemetry Python SDK. Replaced it with the documented `BatchSpanProcessor` and removed an unused `time` import.

## Review Notes
- The in-memory span bridge is suitable as a minimal example, but a production bridge should handle service restarts, concurrent syncs for the same app, duplicate notifications, and graceful tracer provider shutdown.
- The filelog receiver is a contrib/Kubernetes distribution receiver, so deployments need an OpenTelemetry Collector distribution that includes it.
