# Validation Summary: How to Debug Calico Policy Log Rules When Traffic Is Blocked

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico NetworkPolicy
- Calico policy log rules
- calicoctl
- kubectl

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico policy tiers documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes object names documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/

## Issues Found
- The sample policy was about debugging Calico policy log rules, but it did not include any `action: Log` rules. Added `Log` rules before explicit `Deny` rules for unmatched ingress and egress traffic so blocked traffic is actually logged before enforcement stops.
- The sample policy name ended with a hyphen and appeared truncated. Replaced it with `debug-policy-log-rules`, which is a clean Kubernetes-compatible resource name.
- The `calicoctl get` command used the plural `networkpolicies`. Updated it to `networkpolicy`, matching the Calico resource type used in the official `calicoctl` reference.

## Review Notes
The post remains minimal and does not show where to inspect Calico policy logs. Calico's official documentation notes that iptables dataplane logs are commonly available through node kernel logs such as `journalctl`, `/var/log/syslog`, or `/var/log/kern.log`, while eBPF dataplane logs use `bpftool prog tracelog` from `calico-node`.
