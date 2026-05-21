# Validation Summary: How to Set Up Alerting for Istio Certificate Expiration

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Istio
- Istiod / Citadel certificate authority metrics
- Envoy proxy metrics
- Kubernetes
- Prometheus and PrometheusRule alerting
- Grafana
- OpenSSL and shell scripting

## Sources Consulted
- Istio documentation: Certificate Management - https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio documentation: Managing Mesh Certificates - https://istio.io/latest/docs/ops/configuration/traffic-management/manage-mesh-certificates/
- Istio documentation: istioctl proxy-config secret - https://istio.io/latest/docs/reference/commands/istioctl/#istioctl-proxy-config-secret
- Istio documentation: Standard Metrics and Prometheus usage - https://istio.io/latest/docs/reference/config/metrics/
- Istio source / monitoring dashboards for Citadel metrics - https://github.com/istio/istio
- Envoy documentation: Cluster statistics, including SSL connection and verification counters - https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Prometheus documentation: Alerting rules and recording rules - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator documentation: PrometheusRule custom resource - https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes documentation: kubectl exec and jsonpath usage - https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post used `citadel_server_csr_sign_error_count`, but Istio exposes the CSR signing error counter as `citadel_server_csr_sign_err_count`. Updated the metric in the metrics list, alert rule, and Grafana example.
- The post described `envoy_cluster_ssl_handshake` as a handshake failure metric. Envoy documents `ssl.handshake` as successful handshakes, so the example now uses TLS connection and certificate verification error counters.
- The JSON `istioctl proxy-config secret` example labeled base64 certificate bytes as `valid_from`. Updated the pipeline to decode each certificate and print dates and subject with `openssl x509`.
- The `IstioNoCertIssuance` alert checked the raw CSR counter, which only proves that a CSR happened sometime in the past. Updated it to compare recent CSR and issuance rates over the same one-hour window.
- The certificate rotation success recording rule could divide by zero when no CSRs were observed. Added `clamp_min` to keep the expression safe.
- The scripted workload certificate check assumed `/var/run/secrets/istio/cert-chain.pem` exists inside every sidecar. Updated it to use `istioctl proxy-config secret`, which is the documented way to inspect active proxy secrets.
- The external CA alert used the root certificate expiry metric while describing an intermediate certificate. Updated it to use `citadel_server_cert_chain_expiry_timestamp`.

## Review Notes
The examples are accurate for Istio installations that expose Istiod/Citadel and Envoy metrics to Prometheus. Metric availability can vary with Istio version, telemetry configuration, and Prometheus relabeling, so operators should confirm exact exported label names in their own Prometheus target output.
