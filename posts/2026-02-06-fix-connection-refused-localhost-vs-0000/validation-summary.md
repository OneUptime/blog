# Validation Summary: How to Fix 'Connection Refused' Errors When the Collector Listens on localhost

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Operator for Kubernetes
- Kubernetes Pods, Services, and readiness probes
- Python OpenTelemetry OTLP gRPC exporter
- Linux socket inspection commands

## Sources Consulted
- OpenTelemetry blog, "Hardening the Collector Episode 1: A new default bind address": https://opentelemetry.io/blog/2024/hardening-the-collector-one/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector security configuration best practices: https://opentelemetry.io/docs/security/config-best-practices/
- OpenTelemetry Protocol exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Operator repository documentation: https://github.com/open-telemetry/opentelemetry-operator
- OpenTelemetry Collector health_check extension package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/extension/healthcheckextension
- Kubernetes Pods documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The original readiness probe guidance implied that probing the Collector health endpoint would prove the Collector was ready to accept OTLP traffic on the expected interfaces. A health endpoint probe only verifies that the health endpoint is reachable; it does not prove that OTLP gRPC or HTTP receivers are bound to externally reachable addresses. Updated the text to state that the `health_check` extension must be enabled for that probe and that an explicit OTLP connectivity check from another pod is needed to catch this bind-address problem.
- The original takeaway said to always bind to `0.0.0.0` in multi-container or multi-pod deployments. Current OpenTelemetry guidance treats unrestricted bind addresses as a security consideration, so the text was softened to recommend binding to an address reachable by clients, such as `0.0.0.0`, unless there is a reason to restrict access.

## Review Notes
The OTLP receiver examples, OpenTelemetry Operator CRD shape, OTLP default ports, sidecar networking explanation, Python `OTLPSpanExporter` usage, and OTLP environment variables were consistent with the consulted documentation. The `kubectl exec` examples use a form that is commonly accepted, though the Kubernetes reference documents the command separator form as `kubectl exec POD -- COMMAND`.
