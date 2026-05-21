# Validation Summary: How to Debug mTLS Handshake Failures in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- mTLS and TLS handshakes
- SPIFFE workload identities
- DestinationRule and PeerAuthentication resources
- istioctl, kubectl, pilot-agent, jq, OpenSSL

## Sources Consulted
- Istio command reference for `istioctl proxy-config secret`, including `-o json`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio security troubleshooting documentation for inspecting workload certificates and SPIFFE SANs: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio TLS configuration documentation for PeerAuthentication and DestinationRule behavior: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio PeerAuthentication API reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule API reference and `ISTIO_MUTUAL` mode: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio `pilot-agent request` command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Envoy listener TLS statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy TLS troubleshooting and transport failure reason reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/ssl.html
- Envoy admin `/logging` endpoint reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html

## Issues Found
- The first non-zero SSL statistics command used `grep -v "^0"`, but Envoy `/stats` output is formatted as `stat.name: value`, so that pattern would not remove zero-valued counters. Changed it to `grep -v ": 0$"`.
- The diagnostic script used `grep -v ":0$"` for the same purpose, but Envoy stats include a space after the colon. Changed it to `grep -v ": 0$"`.
- The certificate inspection checklist said the X.509 subject should contain the pod's SPIFFE identity. Istio documents the workload identity in the certificate Subject Alternative Name as a URI SAN. Removed the subject requirement and made the SAN example explicit with the `URI:` prefix.
- The debug logging command attempted to set both `connection` and `tls` loggers. Envoy's admin logging API requires exact logger names, and the reviewed official examples support component loggers such as `connection`; `tls` is not a documented component logger. Changed the command to set `connection=debug` and reset `connection=warning`.
- The debug logging text promised exact TLS handshake-step messages. Envoy documents transport failure reasons and connection logging, but not guaranteed step-by-step TLS trace output from this command. Softened the statement to say the logs can provide more detailed connection and transport failure messages.

## Review Notes
Most commands and configuration examples are version-neutral for current Istio sidecar mode. The guide focuses on sidecar proxies; ambient-mode behavior differs because mTLS is handled by ztunnel/HBONE rather than per-pod sidecars.
