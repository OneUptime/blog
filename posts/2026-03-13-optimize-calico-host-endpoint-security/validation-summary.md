# Validation Summary: Optimize Calico Host Endpoint Security

## Status
validated

## Post Type
Tutorial / Guide (performance optimization techniques)

## Technologies Covered
- Calico (host endpoint policies, NetworkSets, GlobalNetworkPolicy)
- Kubernetes (kubectl, operator Installation CRD)
- Felix (FelixConfiguration CRD)
- eBPF dataplane vs. iptables dataplane
- Linux kernel networking

## Sources Consulted
- [Calico Felix Configuration reference](https://docs.tigera.io/calico/latest/reference/resources/felixconfig)
- [Calico Enabling eBPF Dataplane](https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf)
- [Calico GlobalNetworkSet resource](https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset)
- [Calico GlobalNetworkPolicy resource](https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy)
- [Calico Installation CRD (operator.tigera.io)](https://docs.tigera.io/calico/latest/reference/installation/api)

## Issues Found

1. **Outdated eBPF kernel requirement.** The post stated "Linux kernel 5.3+" as the minimum for the Calico eBPF dataplane. Current Calico documentation lists the minimum as Linux kernel 5.10+ for most distributions, with Red Hat 8.4 (kernel 4.18.0-305+) as an exception due to backported features. Updated the text to reflect the current requirement.

2. **Misleading "Batch Settings" description and ineffective values in Optimization 5.** The section described `routeTableRange` and `iptablesRefreshInterval` as "batch settings", which is inaccurate — `routeTableRange` allocates Linux route table indices (unrelated to CPU optimization, and deprecated in favor of `routeTableRanges`), and `iptablesRefreshInterval: 90s` is the default value, so setting it produced no change in behavior. Replaced the patch with `iptablesRefreshInterval`, `routeRefreshInterval`, and `ipsetsRefreshInterval` set to `300s` (above defaults) and rewrote the description to accurately describe what these settings do and the tradeoff involved.

## Review Notes

- The `selector: "has(node)"` syntax in the GlobalNetworkPolicy examples is syntactically valid Calico selector syntax (label-existence check), though in practice host endpoint policies typically use a more specific label scheme. Left as-is since it is technically correct.
- The eBPF "O(1) map lookup" claim in the mermaid diagram is a simplification but accurately conveys the relative complexity difference vs. iptables chain traversal.
- The `kubectl patch installation default` command works against the Tigera operator's `Installation` CRD; the abbreviated resource name `installation` is accepted by kubectl.
- The `GlobalNetworkSet` and `GlobalNetworkPolicy` resource examples use the correct `projectcalico.org/v3` apiVersion and valid field structure.
