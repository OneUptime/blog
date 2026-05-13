# Validation Summary: How to Debug DoS Defense Calico Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico Enterprise policy metrics
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico GlobalNetworkSet
- Calico HostEndpoint
- Felix Prometheus metrics
- Calico eBPF dataplane

## Sources Consulted
- Calico documentation: Defend against DoS attacks - https://docs.tigera.io/calico/latest/network-policy/extreme-traffic/defend-dos-attack
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Enterprise documentation: Policy metrics - https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf

## Issues Found
- The original policy described a rate-limit policy, but the Calico Open Source DoS defense documentation uses HostEndpoint, GlobalNetworkSet, and GlobalNetworkPolicy deny-listing with `doNotTrack` and `applyOnForward`. I replaced the workload allow/rate-limit example with the documented DoS mitigation pattern.
- The original comment claimed rate limiting requires Calico Enterprise or eBPF mode. The official DoS defense guidance is about early deny-list enforcement, not policy rate limiting, so I removed that claim.
- The original metrics commands used `felix_denied` and `felix_denied_packets_total`, which are not listed in the Calico Open Source Felix Prometheus metric reference. I changed the Open Source example to check active local endpoints and policies, and added the Calico Enterprise `calico_denied_packets` policy metric on the documented `9081` endpoint.
- The eBPF command used the ambiguous `installation` resource and framed eBPF as rate-limiting support. I updated it to the documented `installation.operator.tigera.io` patch command with `linuxDataplane`, `bpfNetworkBootstrap`, and `kubeProxyManagement`.

## Review Notes
The HostEndpoint values in the example (`eth0`, `worker-1`, and `10.0.0.10`) are placeholders that must be changed to match the target node and interface before applying in a real cluster.
