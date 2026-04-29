# Validation Summary: How to Monitor Kubewarden Policy Decisions - Policy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Kubernetes
- Prometheus Operator
- Prometheus
- OpenTelemetry Operator
- OpenTelemetry Collector
- Jaeger
- OpenReports

## Sources Consulted
- Kubewarden Metrics quickstart: https://docs.kubewarden.io/howtos/telemetry/metrics-qs
- Kubewarden Tracing quickstart: https://docs.kubewarden.io/howtos/telemetry/tracing-qs
- Kubewarden Custom OpenTelemetry Collector guide: https://docs.kubewarden.io/howtos/telemetry/custom-otel-collector
- Kubewarden Metrics reference: https://docs.kubewarden.io/reference/metrics-reference
- Kubewarden Audit Scanner overview: https://docs.kubewarden.io/explanations/audit-scanner
- Kubewarden Audit Scanner policy reports: https://docs.kubewarden.io/explanations/audit-scanner/policy-reports
- Kubewarden CRD reference: https://docs.kubewarden.io/reference/CRDs
- Kubewarden policy-server source for metrics: https://github.com/kubewarden/policy-server/blob/main/src/metrics.rs
- Kubewarden policy-server metric definitions: https://github.com/kubewarden/policy-server/blob/main/src/metrics/policy_evaluations_total.rs
- Kubewarden policy-server latency metric definition: https://github.com/kubewarden/policy-server/blob/main/src/metrics/policy_evaluations_latency.rs
- Kubewarden controller source for PolicyServer service ports and labels: https://github.com/kubewarden/kubewarden-controller/blob/main/internal/controller/policyserver_controller_service.go
- Kubewarden controller OpenTelemetry sidecar template: https://github.com/kubewarden/kubewarden-controller/blob/main/charts/kubewarden-controller/templates/opentelemetry-collector.yaml
- OpenTelemetry Operator for Kubernetes docs: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- Kubernetes auditing docs: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The post claimed Kubewarden exposed Kubernetes `PolicyViolation` events and audit-log integration as primary observability mechanisms. Current Kubewarden docs instead document Prometheus metrics, OpenTelemetry tracing, and audit-scanner-generated `Report` and `ClusterReport` resources. I replaced the unsupported event-based section with the documented audit report workflow and updated the introduction and feature list accordingly.
- The metrics enablement example did not actually enable metrics; it only set `serviceAccountName` on the `PolicyServer`. I replaced it with the supported `kubewarden-controller` telemetry values for sidecar mode.
- The ServiceMonitor selector and port-forward example were inaccurate for the current controller implementation. I updated the selector to use the actual service labels and changed the metrics check to port-forward the `policy-server-default` service on port `8080`.
- Several metric names were wrong or unsupported. I removed `kubewarden_policy_evaluations_reused_total` and `kubewarden_admission_webhook_latency_seconds`, and corrected the latency metric to `kubewarden_policy_evaluation_latency_milliseconds`.
- The tracing example used direct `PolicyServer` environment variables as if that were the primary documented setup. I replaced it with the current chart-based sidecar telemetry configuration from Kubewarden’s tracing guidance.
- The `OpenTelemetryCollector` manifest used the outdated `opentelemetry.io/v1alpha1` API and an outdated exporter pattern. I updated it to `opentelemetry.io/v1beta1` and aligned the collector pipeline with Kubewarden’s sidecar telemetry configuration.
- The Prometheus alert for slow evaluations referenced the wrong histogram metric and threshold units. I corrected it to use `kubewarden_policy_evaluation_latency_milliseconds_bucket` and compare against `1000` milliseconds for a one-second threshold.
- The compliance script relied on Kubernetes events sorted by deprecated-style timestamps for policy violations. I replaced that logic with current audit report queries based on `Report` and `ClusterReport` resources.

## Review Notes
- Kubewarden’s current docs still show a ServiceMonitor selector based on `app=kubewarden-policy-server-default`, but the current controller source labels the PolicyServer service with standard `app.kubernetes.io/*` labels plus `kubewarden/policy-server`. I aligned the article with the controller source because that is the authoritative implementation.
- Current Kubewarden releases use OpenReports `Report` and `ClusterReport` resources for audit scanner output by default; older `PolicyReport` resources are deprecated and not the default path anymore.
