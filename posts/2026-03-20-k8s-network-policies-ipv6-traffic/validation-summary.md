# Validation Summary: How to Configure Kubernetes Network Policies for IPv6 Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy
- IPv6 and dual-stack networking
- Calico
- Cilium
- Flannel
- `kubectl`

## Sources Consulted
- Kubernetes Network Policies concepts: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Declare Network Policy task: https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/
- Kubernetes IPv4/IPv6 dual-stack concepts: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico dual stack / IPv6 documentation: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Cilium network policy documentation: https://docs.cilium.io/en/stable/security/policy/
- Cilium introduction and platform capabilities: https://docs.cilium.io/en/stable/intro/
- Flannel project README: https://github.com/flannel-io/flannel

## Issues Found
- The introduction originally implied that dual-stack NetworkPolicy rules always need separate IPv4 and IPv6 handling. I corrected that to distinguish `ipBlock` rules from pod- and namespace-based selectors, because selectors apply across address families while `ipBlock` rules need explicit IPv4 and IPv6 CIDRs.
- The IPv6 overview originally described NetworkPolicy too narrowly as using `ipBlock` selectors. I corrected that to include `podSelector` and `namespaceSelector`, which are core parts of the API and important for in-cluster traffic control.
- The post used two invalid IPv6 CIDRs: `fd00:monitoring::/64` and `fd00:lb::/64`. I replaced them with valid example ULA CIDRs.
- The egress example used `ipBlock` to match internal Pod and Service CIDRs. Kubernetes documents `ipBlock` as intended for cluster-external IPs and notes that Service-IP handling can vary because of address rewriting, so I replaced that example with a selector-based in-cluster egress rule.
- The verification command used `kubectl run ... -- wget ...` without `--command`. I updated it to `--command -- wget ...` so the container command matches the current `kubectl run` reference reliably.
- Several headings and sentences framed selector-based policies as specifically "IPv6" policies even though those selectors are IP-family agnostic. I adjusted that wording so the article is accurate without changing its structure.
- The post broadly described deny behavior as if it applied to all IPv6 protocols. I added the Kubernetes caveat that NetworkPolicy deny behavior is defined for TCP, UDP, and SCTP, while protocols such as ICMPv6 can vary by network plugin.

## Review Notes
- The Kubernetes NetworkPolicy API and `networking.k8s.io/v1` examples used in the post are current and non-deprecated.
- Empty `podSelector: {}` and `namespaceSelector: {}` usage in the corrected examples is valid Kubernetes syntax and semantics.
- Calico and Cilium both support IPv6-capable Kubernetes networking and policy features, while Flannel still does not provide NetworkPolicy enforcement by itself.
- `kubectl` was not installed in the local workspace, so command examples were reviewed against the official generated CLI reference rather than executed here.
