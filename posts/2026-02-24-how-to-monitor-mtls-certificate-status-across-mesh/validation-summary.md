# Validation Summary: How to Monitor mTLS Certificate Status Across Mesh

## Status
validated

## Post Type
Tutorial / operational monitoring guide

## Technologies Covered
- Istio
- Istio mTLS and workload certificates
- istioctl
- Envoy / Istio sidecar metrics
- Prometheus and PromQL
- Grafana
- Kubernetes
- jq and OpenSSL

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-discovery command reference and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio pilot-agent command reference and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio Security FAQ for default workload certificate lifetime and `SECRET_TTL`: https://istio.io/latest/about/faq/security/
- Istio security troubleshooting guide for `istioctl proxy-config secret` output and certificate decoding: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio resource labels reference: https://istio.io/latest/docs/reference/config/labels/
- Envoy statistics reference for certificate expiry metric semantics: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics

## Issues Found
- The JSON `jq` example labeled the base64-encoded certificate chain as `validityNotAfter`. Changed the field name to `certificateChain` so it describes the actual value returned by `istioctl`.
- The OpenSSL extraction example used `.dynamicActiveSecrets[0]`, which can select the wrong secret depending on output ordering. Changed it to select the workload certificate by `name == "default"`, matching Istio's own troubleshooting guidance.
- The sidecar certificate metric was listed as `envoy_server_days_until_first_cert_expiring`. Istio sidecar Prometheus output exposes the agent metric as `istio_agent_cert_expiry_seconds`, so the metric examples, dashboard query, alert expression, and explanatory units were corrected.
- The sidecar certificate metric list included `istio_agent_pilot_xds_expired_nonce`, which is an xDS health metric rather than a certificate status metric. Removed it from that list.
- The workload certificate expiry alert used `== 0`, which is brittle for a gauge and would miss already expired certificates with negative values. Changed it to `<= 0`.
- The bulk pod scan selected pods using `security.istio.io/tlsMode=istio`, which is not a documented Istio resource label for selecting sidecar-injected pods. Changed it to select pods that contain the `istio-proxy` container.
- The bulk scan used `grep "Not After"`, but `istioctl proxy-config secret` prints the column as `NOT AFTER`. It also did not account for the two-word `Cert Chain` type. Changed the command to extract the `default` row's expiry field with `awk`.

## Review Notes
The post remains version-general. Metric names were checked against current Istio documentation, but operators should still confirm their Prometheus scrape configuration because some installations filter or relabel sidecar metrics.
