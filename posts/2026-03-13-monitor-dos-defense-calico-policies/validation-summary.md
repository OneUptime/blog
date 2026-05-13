# Validation Summary: How to Monitor Calico DoS Defense Policy Effectiveness

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico GlobalNetworkPolicy
- Calico GlobalNetworkSet
- Calico HostEndpoint-based DoS mitigation
- Calico Felix Prometheus metrics
- Calico Enterprise / Calico Cloud policy metrics
- Kubernetes `kubectl`
- `calicoctl`

## Sources Consulted
- Calico Open Source DoS defense documentation: https://docs.tigera.io/calico/latest/network-policy/extreme-traffic/defend-dos-attack
- Calico Open Source GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Enterprise recommended Prometheus metrics: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics
- Calico Open Source eBPF dataplane enablement: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf

## Issues Found
- The original `dos-defense-rate-limit` policy implied Calico `GlobalNetworkPolicy` supports rate limiting by allowing ports 80 and 443. Calico's documented DoS mitigation pattern is deny-list enforcement using HostEndpoints, `GlobalNetworkSet`, and a `GlobalNetworkPolicy` with `doNotTrack: true` and `applyOnForward: true`. Updated the example accordingly.
- The original policy selected `app == 'web-frontend'`, which applies to workload endpoints, but Calico documents `doNotTrack` and `applyOnForward` as host endpoint policy behavior for early DoS packet drops. Updated the prerequisite and selector to use a HostEndpoint label.
- The original metrics commands used nonexistent OSS Felix metrics, `felix_denied` and `felix_denied_packets_total`. Updated the Felix example to verify active local policies and noted that denied packet counters use `calico_denied_packets` when Calico Enterprise or Calico Cloud policy metrics are enabled.
- The original eBPF section claimed eBPF mode provides rate limiting support. Calico's eBPF dataplane documentation describes dataplane enablement, not a `GlobalNetworkPolicy` rate limiting feature. Renamed the section and corrected the command to use the documented `installation.operator.tigera.io` resource.

## Review Notes
The post now reflects Calico's documented deny-list approach for DoS mitigation. Calico Open Source Felix metrics can show whether policy is active and dataplane state, but per-policy denied packet counters are documented under Calico Enterprise / Calico Cloud policy metrics and require the policy metrics endpoint to be configured.
