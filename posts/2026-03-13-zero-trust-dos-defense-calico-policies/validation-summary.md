# Validation Summary: Zero Trust DoS Defense with Calico Network Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico GlobalNetworkSet
- Calico HostEndpoint
- Felix Prometheus metrics
- Calico QoS controls

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico DoS mitigation guide: https://docs.tigera.io/calico/latest/network-policy/extreme-traffic/defend-dos-attack
- Calico QoS controls: https://docs.tigera.io/calico/latest/networking/configuring/qos-controls
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico eBPF dataplane installation/enabling docs: https://docs.tigera.io/calico/latest/operations/ebpf/install

## Issues Found
- The original GlobalNetworkPolicy was labeled as rate limiting, but Calico policy does not define rate limits in GlobalNetworkPolicy rules. Replaced it with Calico's documented DoS deny-list pattern using GlobalNetworkSet, HostEndpoint, and GlobalNetworkPolicy with `doNotTrack` and `applyOnForward`.
- The original HTTP/HTTPS allow rule used destination ports without specifying a protocol. Added `protocol: TCP`, matching Calico policy requirements for port-based rules.
- The original policy included a catch-all ingress `Allow` rule, which undermined the intended zero trust posture. Removed that rule and kept only the specific HTTP/HTTPS allow rule.
- The original example described documentation-only CIDR ranges as known attack sources. Changed the comment to identify them as example deny-list sources.
- The original monitoring commands referenced `felix_denied` and `felix_denied_packets_total`, which are not listed in the Calico Open Source Felix metrics reference. Replaced them with a documented Felix metric, `felix_active_local_policies`, for verifying metrics exposure.
- The original eBPF section claimed enabling the eBPF dataplane provides rate limiting support. Replaced it with Calico's documented QoS workload annotations for packet-rate limiting.

## Review Notes
The examples use placeholder HostEndpoint values such as `worker-1`, `eth0`, and `10.0.0.1`; operators must replace these with node-specific interface and IP values before applying them in a real cluster.
