# Validation Summary: How to Fix DestinationRule Not Applying in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio DestinationRule
- Istio VirtualService
- Istio mTLS and PeerAuthentication interaction
- istioctl
- Kubernetes kubectl
- Envoy proxy configuration and access logs
- jq

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio traffic management best practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio traffic management common problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio configuration analysis messages: https://istio.io/latest/docs/reference/config/analysis/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The Istio YAML examples used `networking.istio.io/v1beta1`. Updated them to `networking.istio.io/v1`, matching the current Istio API examples and reference documentation.
- The post said Istio uses default round-robin routing without a VirtualService. Updated this to say Istio uses its default load balancing policy, because Istio's documented default is least-request load balancing.
- The post said DestinationRules do not merge and conflicts are undefined. Updated this to reflect Istio's documented DestinationRule fragmentation behavior: duplicate subsets are not merged, and only one top-level `trafficPolicy` is used.
- The post said Envoy falls back to random load balancing when a configured consistent-hash header is missing. Reworded this to the narrower, source-safe claim that no stable header value is available to hash, so the setting will not provide useful session affinity.

## Review Notes
The remaining commands and examples are technically plausible for current Istio and Kubernetes usage. The post could be improved later by recommending fully qualified hostnames consistently, because Istio documents short-name resolution as namespace-relative and recommends FQDNs to avoid misconfiguration.
