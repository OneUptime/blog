# Validation Summary: How to Explain Kubernetes Egress with Calico to Your Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico NetworkPolicy
- Calico Enterprise/Cloud domain-based egress policy
- Calico tiered policy
- CoreDNS/kube-dns

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico Enterprise DNS policy documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy
- Calico Enterprise network policy guide: https://docs.tigera.io/calico-enterprise/latest/network-policy/beginners/calico-network-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico service rules in policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico tiered policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/

## Issues Found
- The `kubectl run` example passed `sleep 3600` as container arguments rather than explicitly overriding the container command. Changed it to `kubectl run test-pod --image=nicolaka/netshoot --command -- sleep 3600`, matching the official `kubectl run` syntax.
- The example used `malware-domain.example.com` and claimed it would succeed. Since `example.com` is reserved and that subdomain is not a reliable reachable endpoint, changed the example to `http://example.com` and clarified that reachable external endpoints are allowed unless egress is restricted.
- The `ifconfig.me` comment said it returns the node's IP. In many clusters it returns a public NAT address rather than a literal node IP, so the comment now says "node or cluster NAT public IP."
- The text claimed any pod can reach any IP on the internet. Updated this to "any routable external IP" to account for routing, firewall, and upstream network constraints.
- The Calico policy example used a domain-based egress allow without explicitly allowing DNS. Calico's own domain policy examples include DNS allowance, and Kubernetes documents that default-deny egress blocks DNS. Added `types: Egress` and an allow rule for the `kube-dns` service before the domain allow.
- The post presented domain-based policy as generic Calico functionality. Clarified that `destination.domains` is for Calico Enterprise or Calico Cloud, and that Calico Open Source users should use IP/CIDR rules or NetworkSets.
- The best-practices section recommended FQDN-based policy without a product caveat. Added "Where supported" to keep it accurate across Calico editions.
- The tiered policy sentence described the feature as Enterprise-only. Current Calico documentation includes tiered policy for Calico Open Source as well, so the wording now refers to Calico tiered policy and ties non-override behavior to RBAC configuration.
- The DNS Q&A incorrectly stated that pod-to-DNS traffic is not affected by egress policy because CoreDNS is inside the cluster. Corrected it to state that egress policy applies to outbound traffic from selected pods, including DNS traffic to CoreDNS, and that an explicit DNS allow is required.
- The best-practices section referred to Calico flow logs without a product caveat. Updated it to "Calico flow logs where available, or another flow logging source."

## Review Notes
The post is technically relevant and contains implementation examples. It is now accurate for current Kubernetes and Calico behavior, with product-specific caveats for Calico Enterprise/Cloud domain-based policy.
