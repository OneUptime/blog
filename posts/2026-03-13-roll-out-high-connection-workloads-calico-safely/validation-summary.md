# Validation Summary: How to Roll Out Calico Policies for High-Connection Workloads Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- Calico NetworkPolicy (projectcalico.org/v3)
- Calico FelixConfiguration
- calicoctl / kubectl
- Linux conntrack-tools
- Prometheus (metrics endpoint)
- Mermaid (diagram)

## Sources Consulted
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration guide: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- projectcalico/calico source (felixconfig.go) for valid field names
- conntrack(8) manpage and conntrack-tools manual (netfilter.org)

## Issues Found
- **Invalid FelixConfiguration field `ipSetSize`**: The Performance Tuning section included `"ipSetSize": 1048576` in the FelixConfiguration patch. This field does not exist in Calico's FelixConfiguration spec; applying the patch as written would fail or be silently ignored depending on validation. Removed the `ipSetSize` line. The remaining `maxIpsetSize` (the correct field for sizing ipsets) and `prometheusMetricsEnabled` are valid and were left intact.

## Review Notes
- The NetworkPolicy YAML is correct for the `projectcalico.org/v3` API: `order`, `selector`, `ingress`/`egress` with `action`, `source`/`destination`, `protocol`, `ports`, and `types` are all valid fields and shapes.
- `kubectl exec -n kube-system calico-node-xxx -- conntrack -S` is valid; `calico-node-xxx` is a clear placeholder pod name. Note that `conntrack` must be available inside the calico-node container (it is in standard `calico/node` images).
- `maxIpsetSize` is not applicable when using the nftables dataplane backend — readers using nftables instead of iptables should be aware this tuning has no effect.
- The post does not actually tune connection-tracking-specific knobs (e.g. kernel `nf_conntrack_max`, `IptablesPostWriteCheckInterval`), which would be the more impactful settings for "high-connection workloads." The current tuning shown is reasonable but light; future revisions could expand here.
- Mermaid `\n` inside a node label is supported and renders as a line break.
