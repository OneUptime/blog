# Validation Summary: How to Monitor Data Plane Certificate Status

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar data plane
- Envoy SDS and admin endpoints
- Istio mTLS and SPIFFE identities
- Prometheus metrics and alerting
- Kubernetes CLI operations
- IstioOperator and proxy metadata configuration

## Sources Consulted
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `pilot-agent` command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio `pilot-discovery` command reference and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio security common problems, including `proxy-config secret`: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio plug-in CA certificates documentation: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Envoy `/certs` admin proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/certs.proto.html
- Envoy statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- Envoy SDS documentation and SDS statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/security/secret

## Issues Found
- The post said Envoy sends CSRs directly to istiod and receives the signed certificate via SDS. Updated the flow to describe `istio-agent` requesting the certificate from istiod and serving it to Envoy through the local SDS server.
- The post used `istioctl authn tls-check`, which is an old command not present in the current Istio command reference. Replaced it with Istio telemetry checks using `connection_security_policy="mutual_tls"` for HTTP and TCP metrics.
- The root CA expiry metric was presented as the more practical workload certificate expiry metric. Clarified that `envoy_server_days_until_first_cert_expiring` is for proxy certificate expiry and `citadel_server_root_cert_expiry_timestamp - time()` is for root CA expiry.
- The post claimed Istio rotates workload certificates at 80% of TTL. Updated this to the current default behavior controlled by `SECRET_TTL` and `SECRET_GRACE_PERIOD_RATIO`, where the default ratio is 0.5 with jitter.
- The SDS stats `sds.total_active_sds_secrets` and `sds.key_rotation_count` were not supported by Envoy's documented SDS statistics. Replaced them with documented SDS-related counters and istiod CSR/issuance metrics.
- The CA signing metrics used `citadel_server_csr_count` as successful signings and `citadel_server_authentication_failure_count` as signing failures. Replaced these with `citadel_server_success_cert_issuance_count` and `citadel_server_csr_sign_err_count`.
- The root CA secret command used `istio-ca-secret`, which is not the documented current plug-in CA secret. Updated the command to use `cacerts` for plug-in CA deployments and noted that self-signed CA deployments should use istiod CA expiry metrics.
- The proxy-only restart note incorrectly tied application-container survival to `holdApplicationUntilProxyStarts`. Removed that condition.

## Review Notes
The post is now accurate for current Istio sidecar-mode operations. Some checks, especially mTLS verification through metrics, depend on Prometheus/Istio telemetry being installed and scraping the relevant workloads.
