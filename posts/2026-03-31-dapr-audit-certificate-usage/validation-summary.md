# Validation Summary: How to Audit Certificate Usage in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Sentry component for certificate management)
- Kubernetes (kubectl, Helm, ConfigMaps)
- Prometheus (PromQL queries and alerting rules)
- Grafana (mentioned for visualization)
- SPIFFE (workload identity standard)
- Fluent Bit (log shipping to SIEM)
- Python (log parsing script)
- OpenSSL (certificate inspection)

## Sources Consulted
- Dapr Helm chart source (`dapr/dapr` GitHub repository) — `charts/dapr/charts/dapr_sentry/values.yaml` and deployment templates
- Dapr Sentry source code — `pkg/sentry/monitoring/metrics.go` for Prometheus metric names
- Dapr SPIFFE implementation — `pkg/security/spiffe/spiffe.go` for SPIFFE ID format
- Dapr security internals — `pkg/security/sentry.go` for workload certificate lifecycle (in-memory, not on disk)
- Dapr metrics documentation — `docs/development/dapr-metrics.md`
- Dapr injector constants — `pkg/injector/consts/consts.go` for sidecar mount paths
- Python 3.12 changelog — deprecation of `datetime.utcnow()` (gh-91078)
- Prometheus alerting rule documentation — rule syntax validation
- Fluent Bit documentation — filter configuration syntax

## Issues Found

1. **SPIFFE ID format was incorrect**: The post showed `spiffe://cluster.local/ns/production/dapr/order-service` with an extra `/dapr/` path segment. Dapr's actual SPIFFE ID format is `spiffe://<trust-domain>/ns/<namespace>/<app-id>` — there is no `dapr/` segment. Fixed to `spiffe://cluster.local/ns/production/order-service`. Confirmed via Dapr source code (`spiffeid.FromSegments(td, "ns", namespace, appID)`) and test assertions.

2. **Certificate file path was incorrect**: The post used `kubectl exec` to read `/var/run/secrets/dapr.io/tls/tls.crt` from the daprd sidecar container. This path does not exist in the sidecar — Dapr workload certificates are obtained via gRPC from Sentry and held entirely in memory (never written to disk). The path `/var/run/secrets/dapr.io/tls/ca.crt` exists only for control plane services (operator, placement, etc.), not the daprd sidecar. Fixed the command to use `kubectl port-forward` and `openssl s_client` to extract the certificate from the sidecar's live TLS connection on its internal gRPC port (50001).

3. **Unused Python import**: `import re` was imported but never used in the log parsing script. Removed.

4. **Deprecated Python API**: `datetime.utcnow()` was deprecated in Python 3.12 (raises `DeprecationWarning`). Replaced with `datetime.now(timezone.utc)` and updated the import to include `timezone`.

## Review Notes
- The Prometheus metric name `dapr_sentry_cert_sign_request_received_total` is confirmed correct per Dapr source code. However, the PromQL query groups by `app_id` label — this label may not be present on Sentry-side metrics since the metric is recorded at the Sentry server, not the sidecar. The query will still function (it will just not split by app_id if the label is absent), but readers should verify available labels in their environment.
- The Helm value path `dapr_sentry.logLevel=debug` is confirmed correct per the Dapr Helm chart values.yaml.
- The Fluent Bit and Prometheus alerting rule YAML snippets are syntactically correct.
