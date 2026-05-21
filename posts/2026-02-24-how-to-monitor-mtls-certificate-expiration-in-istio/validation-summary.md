# Validation Summary: How to Monitor mTLS Certificate Expiration in Istio

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Istio service mesh
- Istio mTLS and workload certificates
- istioctl
- Kubernetes Secrets and ConfigMaps
- Envoy sidecar metrics
- Prometheus alerting and PromQL
- Grafana dashboards
- Bash, jq, and OpenSSL

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-discovery environment variables and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio Managing In-Mesh Certificates: https://istio.io/latest/docs/ops/configuration/traffic-management/manage-mesh-certificates/
- Istio Security FAQ certificate lifetime guidance: https://istio.io/latest/about/faq/security/
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Envoy statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- Envoy certificate admin API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/certs.proto
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The certificate chain description implied that Istio always uses a root CA plus intermediate CA. Updated it to distinguish plug-in CA deployments from the default self-signed Istio CA behavior.
- The default root CA check used the old `istio-ca-secret` path and the plug-in CA example read `ca-cert.pem` while describing the root certificate. Updated the default example to read `root-cert.pem` from the `istio-ca-root-cert` ConfigMap and the plug-in CA example to read `root-cert.pem` from the `cacerts` Secret.
- The istiod certificate signing error metric was listed as `citadel_server_csr_signing_error_count`, but current Istio exposes `citadel_server_csr_sign_err_count`. Updated all metric references and PromQL examples.
- The root CA alert description used `humanizeTimestamp` on an expression whose value is seconds until expiry, not an absolute Unix timestamp. Updated it to `humanizeDuration`.
- The workload certificate metric was treated as a histogram and as a precise expiration signal for 24-hour certificates. Envoy documents `days_until_first_cert_expiring` as a gauge in days, so the dashboard query was changed from `histogram_quantile(...)` to `quantile(...)`, and the alert text now warns that day-granularity makes `0` normal with default 24-hour workload certificates.

## Review Notes
The guide is accurate after the fixes. The workload certificate expiry metric remains coarse for Istio's default 24-hour workload certificates, so production monitoring should pair that metric with direct `istioctl proxy-config secret` checks or other certificate inventory tooling when diagnosing rotation failures.
