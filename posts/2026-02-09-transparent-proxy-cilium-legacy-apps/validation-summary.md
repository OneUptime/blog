# Validation Summary: How to Implement Transparent Proxy with Cilium for Legacy Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cilium
- Cilium Local Redirect Policy
- Cilium Network Policy
- Cilium Hubble
- CoreDNS
- Helm
- eBPF networking
- Envoy proxying

## Sources Consulted
- Cilium Local Redirect Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/local-redirect-policy/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes without kube-proxy documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Layer 7 protocol visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Layer 7 policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium DNS-based policies documentation: https://docs.cilium.io/en/stable/security/dns/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble UI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium L7 service load balancing documentation: https://docs.cilium.io/en/latest/network/servicemesh/envoy-load-balancing/
- CoreDNS rewrite plugin documentation: https://coredns.io/plugins/rewrite/
- CoreDNS import plugin documentation: https://coredns.io/plugins/import/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/

## Issues Found
- The post described a single Cilium "transparent proxy feature" that automatically handles DNS and service redirection. Updated the wording to describe the actual combination of CoreDNS rewrites, Cilium eBPF service handling, Local Redirect Policy, and Envoy-backed L7 features.
- The kube-proxy replacement configuration used the outdated `strict` value. Updated examples and expected status text to use `kubeProxyReplacement=true`.
- The "transparent proxy mode" Helm values included unsupported or incorrect current settings: `enableCiliumEndpointSlice`, `hostServices.enabled`, and `hostServices.protocols`. Replaced them with `localRedirectPolicies.enabled=true`, `l7Proxy=true`, and `loadBalancer.l7.backend=envoy`.
- The pod example used the obsolete `io.cilium/proxy-visibility` annotation. Removed it and clarified that the DNS rewrite is handled by CoreDNS, not a per-pod annotation.
- The Local Redirect Policy explanation said the backend was a Kubernetes service. Corrected it to explain that `localEndpointSelector` selects local backend pods.
- The Cilium service annotations were incorrect (`service.cilium.io/lb-l7-enabled` and `service.cilium.io/lb-l7-protocol`). Replaced them with the supported `service.cilium.io/lb-l7: "enabled"` annotation.
- The L7 visibility example claimed PostgreSQL visibility with `l7proto: "postgres"`. Replaced it with a supported HTTP L7 visibility example and added a note that PostgreSQL should use L3/L4 policy and Hubble flow visibility unless a supported parser is available.
- The DNS egress policy allowed only UDP/53. Updated it to `protocol: ANY`, matching Cilium's DNS policy examples for TCP and UDP DNS.
- Several `kubectl exec` examples omitted the `production` namespace even though the pod was namespaced. Added `-n production`.
- Hubble commands mixed Cilium CLI and Hubble CLI usage and assumed UI was installed. Updated the example to use `cilium hubble enable --ui`, `cilium hubble ui`, and `hubble observe`.
- Cilium agent debug commands used `cilium` where current docs use `cilium-dbg` inside the agent pod. Updated service, BPF, and endpoint inspection commands.
- The performance section asserted a universal `< 1ms` latency overhead. Replaced it with guidance to benchmark locally and distinguished eBPF L3/L4 service handling from Envoy-proxied L7 traffic.
- The security policy used `egressDeny` to "block everything else", which would also deny the previously allowed endpoint traffic. Removed the deny rule and explained Cilium egress default-deny behavior for selected endpoints.

## Review Notes
The corrected post is technically valid as a migration guide, but the title still uses "transparent proxy" broadly. Future revisions could be clearer by explicitly naming the separate mechanisms: CoreDNS rewrite for legacy hostnames, Cilium Local Redirect Policy for static IP destinations, and Cilium L7 proxying for HTTP visibility or service load balancing.
