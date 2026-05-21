# Validation Summary: How to Quickly Check mTLS Status Between Services

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy
- mutual TLS
- PeerAuthentication
- DestinationRule
- istioctl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio istioctl describe guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy TLS documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/ssl.html

## Issues Found
- The post used `istioctl authn tls-check`, which is not present in the current Istio command reference. Replaced it with `istioctl x describe pod` for policy/conflict checks and `istioctl proxy-config clusters` for destination-specific outbound cluster inspection.
- The mesh-wide PeerAuthentication section implied the policy always lives in `istio-system` and that `STRICT` always forces all mesh traffic to mTLS. Updated the wording to use Istio's root namespace, commonly `istio-system`, and to mention namespace, workload, and port-level overrides.
- The `proxy-config clusters` examples used `deploy/...` resource syntax and grepped for `transport_socket`. Updated the examples to documented `deployment/...` syntax and the JSON `transportSocket` field.
- The pod request test said application `curl` could verify TLS details via verbose output from the `istio-proxy` container. Updated the example to run from the application container and clarified that application-level curl confirms end-to-end behavior but does not expose the sidecar-to-sidecar TLS handshake.
- The Envoy stats example used direct admin-port curl and treated non-zero TLS counters as current problems. Updated it to Istio's documented `pilot-agent request GET stats` command and clarified that increasing error counters during reproduction are the useful signal.

## Review Notes
The guide is written for Istio sidecar mode. Ambient mode uses ztunnel/HBONE diagnostics and would need separate commands such as ambient ztunnel configuration checks.
