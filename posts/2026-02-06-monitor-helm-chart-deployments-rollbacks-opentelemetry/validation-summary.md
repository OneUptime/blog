# Validation Summary: How to Monitor Helm Chart Deployments and Rollbacks with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- OpenTelemetry Collector
- OpenTelemetry Operator
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Python SDK
- otel-cli
- Kubernetes RBAC

## Sources Consulted
- OpenTelemetry Operator for Kubernetes: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator auto-instrumentation endpoint/service naming docs: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Collector Kubernetes Events Receiver docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/k8seventsreceiver
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python exporter docs: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter API docs: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- otel-cli README: https://github.com/equinix-labs/otel-cli
- Helm upgrade command docs: https://helm.sh/docs/helm/helm_upgrade/
- Helm rollback command docs: https://helm.sh/docs/helm/helm_rollback/
- Helm history command docs: https://helm.sh/docs/helm/helm_history/

## Issues Found
- The examples used `helm-deploy-collector.monitoring` as the collector service endpoint. The OpenTelemetry Operator creates the service using the OpenTelemetryCollector resource name with a `-collector` suffix, so I changed the OTLP endpoints to `helm-deploy-collector-collector.monitoring`.
- The post claimed the rollback span would appear in the same trace as the upgrade span. Separate `otel-cli` invocations do not automatically share trace context unless `traceparent` is preserved or background span mode is used, so I corrected the explanation.
- The Kubernetes events RBAC example only created a ClusterRole. A ClusterRole does not grant permissions without a binding, so I added a ServiceAccount and ClusterRoleBinding and noted that the collector should use that service account.
- The `k8s_events` receiver is not available in every Collector distribution. I added a note that the collector image must include the receiver, such as the Kubernetes or contrib distribution.

## Review Notes
Helm was not installed locally, so CLI flags were verified against the current official Helm command documentation rather than local `--help` output. The Python metrics example uses current OpenTelemetry SDK APIs; a production implementation should also pin package versions and set backend-specific resource attributes such as `service.name` if required.
