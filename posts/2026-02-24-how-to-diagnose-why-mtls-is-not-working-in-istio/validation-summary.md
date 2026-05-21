# Validation Summary: How to Diagnose Why mTLS is Not Working in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecar proxies
- Mutual TLS (mTLS)
- PeerAuthentication
- DestinationRule
- istioctl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio istioctl describe diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio SPIRE integration guide, for `proxy-config secret -o json` certificate inspection pattern: https://istio.io/latest/docs/ops/integrations/spire/
- Istio pilot-discovery exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/

## Issues Found
- The post used `istioctl authn tls-check`, which is not present in the current official `istioctl` command reference. Replaced it with `istioctl x describe pod`, which the Istio diagnostic guide documents for detecting strict mTLS configuration and TLS conflicts.
- The certificate inspection example read `/var/run/secrets/istio/cert-chain.pem` directly from the proxy. Modern Istio sidecars receive workload certificates through SDS, so the more reliable documented inspection path is `istioctl proxy-config secret -o json`. Updated the command to decode the active default certificate chain and inspect it with `openssl`.
- The `jq` command for finding pods without sidecars used `select(.spec.containers[].name != "istio-proxy")`, which returns pods that have any non-proxy container, including correctly injected pods. Replaced it with a list-based `index("istio-proxy") | not` check.
- The namespace-level STRICT mTLS section said every pod in the namespace must have a sidecar and that any pod without a sidecar will break. Narrowed this to pods that need to participate in mesh mTLS or call STRICT mTLS workloads, which matches Istio's sidecar and PeerAuthentication behavior more precisely.

## Review Notes
The remaining PeerAuthentication and DestinationRule examples use the current `security.istio.io/v1` and `networking.istio.io/v1` APIs. The post is sidecar-mode focused; ambient mode has different constraints, including that PeerAuthentication `DISABLE` is not supported for ambient workloads.
