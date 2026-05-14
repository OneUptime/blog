# Validation Summary: Common Mistakes to Avoid with Calico DoS Defense Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Calico GlobalNetworkSet
- Calico eBPF dataplane
- Felix Prometheus metrics

## Sources Consulted
- Calico documentation: Defend against DoS attacks - https://docs.tigera.io/calico/latest/network-policy/extreme-traffic/defend-dos-attack
- Calico documentation: Global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Configuring Felix Prometheus metrics - https://docs.tigera.io/calico/latest/reference/felix/configuration
- IETF RFC 5737: IPv4 Address Blocks Reserved for Documentation - https://www.rfc-editor.org/rfc/rfc5737

## Issues Found
- The original policy was named and described as a rate-limit policy, but Calico Open Source `GlobalNetworkPolicy` does not define rate-limit fields. The example only allowed traffic. I changed the configuration to the documented DoS mitigation pattern using `HostEndpoint`, `GlobalNetworkSet`, and a `GlobalNetworkPolicy` with `doNotTrack: true` and `applyOnForward: true`.
- The original DoS deny-list used inline CIDRs in a workload policy. While syntactically valid, Calico's documented DoS workflow uses a labeled `GlobalNetworkSet` so attack CIDRs can be updated quickly and matched by policy. I changed the example accordingly.
- The original monitoring commands referenced `felix_denied` and `felix_denied_packets_total`. Those are not listed as Calico Open Source Felix metrics in the current Felix metrics reference. I changed the example to verify the Calico resources and to query a documented Felix metric, `felix_active_local_policies`, when Prometheus metrics are enabled.
- The original eBPF command patched `installation default`; the documented operator resource is `installation.operator.tigera.io default`. I corrected the command and removed the inaccurate claim that eBPF enables policy rate limiting.

## Review Notes
The post is now technically aligned with Calico's documented DoS mitigation approach. The placeholder IP ranges `198.51.100.0/24` and `203.0.113.0/24` are RFC 5737 documentation ranges, so operators should replace them with real deny-list CIDRs before use.
