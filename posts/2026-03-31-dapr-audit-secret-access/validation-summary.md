# Validation Summary: How to Audit Secret Access in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar, Configuration CRD, secret store API)
- Kubernetes (Deployments, annotations, audit logging, API server audit policy)
- HashiCorp Vault (audit devices, file audit backend)
- OpenTelemetry / Zipkin (distributed tracing)
- Jaeger (trace collection via Zipkin-compatible endpoint)

## Sources Consulted
- Dapr documentation on Kubernetes annotations: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-annotations/
- Dapr documentation on observability and tracing configuration: https://docs.dapr.io/operations/observability/tracing/tracing-overview/
- Dapr documentation on the secrets API: https://docs.dapr.io/developing-applications/building-blocks/secrets/secrets-overview/
- HashiCorp Vault audit devices documentation: https://developer.hashicorp.com/vault/docs/audit
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
No technical issues found.

## Review Notes
- The sample sidecar log output (the `SECRET: GET secret name=db-creds` line) is illustrative rather than an exact copy of real Dapr log output. Actual sidecar logs show HTTP/gRPC access log entries for the secrets API endpoint (`/v1.0/secrets/{storeName}/{key}`). The approach of grepping sidecar logs for secret access is valid, though users should grep for the actual API path pattern rather than the fabricated "SECRET:" prefix shown.
- The tracing section mentions "OpenTelemetry tracing" but configures via the `zipkin` endpoint block. This works correctly (Dapr exports traces in Zipkin format to the configured endpoint, and Jaeger accepts Zipkin-format spans on port 9411). Dapr also supports a native `otel` exporter configuration block for OTLP endpoints, which may be preferred in newer setups.
- The Vault audit log JSON shown is a simplified excerpt. Actual Vault audit log entries contain additional fields (client_token hash, accessor, remote_address, namespace, etc.), but the fields shown are accurate.
- The `kubectl logs -l app=my-service` command assumes the pod has an `app=my-service` label, which depends on the user's deployment labels configuration. This is a standard convention but not automatically set by Dapr.
