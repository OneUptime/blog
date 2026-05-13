# Validation Summary: How to Migrate to Calico DoS Defense Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico GlobalNetworkSet
- Calico HostEndpoint
- calicoctl
- Tigera Operator
- Felix Prometheus metrics
- Calico eBPF dataplane

## Sources Consulted
- Calico documentation: Defend against DoS attacks - https://docs.tigera.io/calico/latest/network-policy/extreme-traffic/defend-dos-attack
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Install in eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The original policy example was named as a rate-limit policy, but the Calico DoS mitigation documentation describes deny-list enforcement with HostEndpoint, GlobalNetworkSet, and GlobalNetworkPolicy resources. Replaced the example with that documented resource pattern.
- The original allow policy allowed ports 80 and 443 and then allowed all remaining ingress, which did not implement DoS defense. Replaced it with a deny policy using `doNotTrack: true`, `applyOnForward: true`, and a source selector that matches a deny-list GlobalNetworkSet.
- The post claimed rate limiting is supported by Calico Enterprise or eBPF mode. The official DoS defense guidance is about early packet drops and XDP/iptables raw enforcement, not enabling request rate limiting by switching to eBPF mode. Renamed the eBPF section and changed the comment to describe enabling the eBPF dataplane only.
- The `kubectl patch installation default` command used the wrong resource name for an operator-managed Installation. Updated it to `kubectl patch installation.operator.tigera.io default --type merge ...`, matching the Tigera Operator documentation.
- The monitoring commands searched for undocumented `felix_denied` and `felix_denied_packets_total` metrics. Replaced them with a documented Felix metric, `felix_active_local_policies`, and a command to inspect the active deny-list GlobalNetworkSet.

## Review Notes
The corrected examples use placeholder host endpoint values (`eth0`, `jasper`, and `10.0.0.1`) from the Calico documentation pattern; production users must adapt these values to their actual node names, interfaces, and host IPs. The YAML block was parsed successfully after the edits.
