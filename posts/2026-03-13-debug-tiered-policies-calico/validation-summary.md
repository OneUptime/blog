# Validation Summary: How to Debug Calico Tiered Policies When Traffic Is Blocked in Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source network policy
- Calico `NetworkPolicy` and `GlobalNetworkPolicy` resources
- Calico policy tiers
- Kubernetes
- `calicoctl` and `kubectl`

## Sources Consulted
- Calico documentation: Policy tiers, https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico documentation: Tier resource, https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico documentation: NetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: GlobalNetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Use log rules to test network policy, https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The policy review commands listed namespace and global policies but did not include tiers. I added `calicoctl get tiers -o wide` because tier order affects how Calico evaluates tiered policies.
- The temporary log policy used `order: 999`, which would give it high precedence in the default tier instead of placing it near the bottom for troubleshooting unhandled traffic. I changed it to `tier: default` and `order: 100001`, matching Calico's documented log-rule examples.
- The temporary log policy only logged ingress traffic. I added egress logging and `Egress` to `types` so the example can reveal traffic blocked on either direction.
- The log review command searched for uppercase `CALICO`, but Calico's documented iptables log examples use the `calico-packet` prefix in kernel logs. I changed the command to search kernel logs for `calico-packet`.
- The post did not account for Calico's eBPF data plane logging path. I added the documented `bpftool prog tracelog` command for eBPF clusters.

## Review Notes
The post remains a concise troubleshooting guide. In a future revision, it could explain how to set `tier: <tier-name>` when debugging a custom tier instead of the default tier, but the existing structure was preserved as requested.
