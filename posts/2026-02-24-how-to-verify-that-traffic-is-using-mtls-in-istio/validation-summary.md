# Validation Summary: How to Verify That Traffic is Using mTLS in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio mutual TLS
- PeerAuthentication
- DestinationRule / auto mTLS
- istioctl
- Envoy proxy configuration, access logs, and stats
- Prometheus / PromQL
- Kiali
- tcpdump / Wireshark
- Kubernetes CLI

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio istioctl describe documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio proxy command diagnostics: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy access logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio TLS configuration and auto mTLS documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- Istio ambient mTLS verification documentation: https://istio.io/latest/docs/ambient/usage/verify-mtls-enabled/
- Envoy access log command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy listener TLS statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Kiali security documentation: https://kiali.io/docs/features/security/

## Issues Found
- The proxy configuration section said certificate paths like `/etc/certs/` may appear. Current Istio sidecars normally use SDS secrets for workload certificates, so the text now points readers to SDS and the TLS filter chain.
- The access log section said the default Istio access log format includes `DOWNSTREAM_TLS_VERSION` and `DOWNSTREAM_TLS_CIPHER`. Istio's documented default format does not include these fields, so the post now states that a custom access log format is required.
- The Envoy stats example used `ssl.peer_certificate_error`, which is not the documented Envoy listener TLS stat. It was replaced with `ssl.fail_verify_no_cert` and `ssl.fail_verify_error`, and the descriptions were updated.
- The packet capture guidance implied all TLS handshake details and certificates would always be visible. The wording now accounts for TLS version and capture timing, and focuses on verifying encrypted proxy-to-proxy application data.
- The automation script was described as checking mTLS status across all services, but it actually checks PeerAuthentication mode and sidecar coverage. The description now matches what the script does, includes revision-labeled namespaces, and tells readers to use metrics or proxy config for actual mTLS confirmation.

## Review Notes
The post is technically relevant and useful as a practical guide. The methods apply primarily to sidecar mode; ambient mode has additional validation commands and ztunnel-specific signals that could be covered in a future update.
