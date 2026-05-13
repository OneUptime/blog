# Validation Summary: How to Configure DoS Defense with Calico Network Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico `projectcalico.org/v3` resources
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Calico GlobalNetworkSet
- Felix Prometheus metrics
- Calico eBPF dataplane and XDP acceleration

## Sources Consulted
- Calico documentation: Defend against DoS attacks - https://docs.tigera.io/calico/latest/network-policy/extreme-traffic/defend-dos-attack
- Calico documentation: Global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Install in eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Felix configuration - https://docs.tigera.io/calico/latest/reference/felix/configuration

## Issues Found
- The original "rate limit" policy did not configure rate limiting. Calico Open Source network policy does not provide a per-policy rate-limit field; the documented DoS mitigation pattern uses HostEndpoint resources, a GlobalNetworkSet deny-list, and a GlobalNetworkPolicy with `doNotTrack: true` and `applyOnForward: true`. Replaced the YAML with that supported pattern.
- The original deny-list policy matched workload endpoints with `selector: app == 'web-frontend'`, which does not follow Calico's documented DoS defense guidance for dropping traffic as early as possible at host endpoints. Changed the selector to target labeled HostEndpoints.
- The original Felix monitoring commands referenced `felix_denied` / `felix_denied_packets_total`, which are not listed in the current Calico Open Source Felix metrics reference. Replaced them with the documented Felix metrics enablement command and a valid `felix_active_local` metrics check.
- The eBPF section claimed eBPF mode enables rate limiting. The Calico documentation describes eBPF/XDP acceleration for policy enforcement and DoS mitigation, not a network-policy rate-limit feature. Renamed the section and updated the operator patch to the documented eBPF dataplane form.

## Review Notes
The example uses documentation-reserved CIDR ranges (`198.51.100.0/24` and `203.0.113.0/24`) as placeholders for known attack sources, which is appropriate for a blog example. Users must replace the HostEndpoint `node`, `interfaceName`, and `expectedIPs` values with their own node details before applying the policy.
