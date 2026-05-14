# Validation Summary: How to Build DNS-Based Egress Policies in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- DNS-based egress policy
- `kubectl`
- `cilium-dbg`

## Sources Consulted
- Cilium documentation: Locking Down External Access with DNS-Based Policies, https://docs.cilium.io/en/latest/security/dns/
- Cilium documentation: DNS based policy language, https://docs.cilium.io/en/stable/security/policy/language/#dns-based
- Cilium documentation: Troubleshooting `toFQDNs` rules, https://docs.cilium.io/en/stable/security/policy/troubleshooting/#troubleshooting-tofqdns-rules
- Cilium command reference: `cilium-dbg fqdn cache list`, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_fqdn_cache_list/

## Issues Found
- The prerequisite said "Cilium 1.10+ with DNS proxy enabled". Current Cilium documentation describes DNS policy enforcement as requiring L7 proxy support and an L7 DNS policy, so the prerequisite was changed to "Cilium with L7 proxy support enabled for DNS policy enforcement".
- The kube-dns selector used unprefixed labels (`io.kubernetes.pod.namespace` and `k8s-app`). Cilium's official examples select kube-dns with Cilium identity labels (`k8s:io.kubernetes.pod.namespace` and `k8s:k8s-app`), so the YAML was updated accordingly.
- The DNS allow rule only allowed UDP on port 53. Official Cilium examples use `protocol: ANY`, which covers both UDP and TCP DNS traffic, so the snippet was updated to avoid blocking TCP DNS.
- The explanation said the DNS proxy dynamically caches resolved IPs in eBPF policy maps. Cilium documentation describes intercepted DNS responses being recorded in the agent FQDN cache and then used for `toFQDNs` policy decisions, so the prose and diagram were corrected.

## Review Notes
The `toFQDNs` and `toPorts` structure is valid for CiliumNetworkPolicy, and `cilium-dbg fqdn cache list` is a current command for inspecting FQDN cache entries. The example remains intentionally minimal; production policies may need to account for the actual DNS service labels, namespace, and port used by a given cluster distribution.
