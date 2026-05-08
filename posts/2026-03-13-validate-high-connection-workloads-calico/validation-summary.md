# Validation Summary: How to Validate Calico Policies for High-Connection Workloads Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy and GlobalNetworkPolicy resources
- Calico HostEndpoint resources
- FelixConfiguration
- Linux conntrack

## Sources Consulted
- Calico documentation: Enable extreme high-connection workloads - https://docs.tigera.io/calico/latest/network-policy/extreme-traffic/high-connection-workloads
- Calico documentation: Global network policy resource reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Network policy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Felix configuration resource reference - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Connection tracking - https://docs.tigera.io/calico/latest/reference/host-endpoints/conntrack

## Issues Found
- The original policy used a namespaced `NetworkPolicy` for a high-connection workload. Regular Calico network policy is valid, but Calico's documented high-connection workload pattern uses a `HostEndpoint` plus `GlobalNetworkPolicy` with `doNotTrack: true` and `applyOnForward: true` to bypass Linux conntrack for selected traffic. Updated the core configuration to use that supported pattern.
- The original egress rules allowed backend and DNS traffic without accounting for the stateless nature of `doNotTrack` policy. Calico documentation states that untracked policy requires explicit return traffic rules. Updated the example to use symmetrical TCP ingress and egress rules for the service port.
- The Felix tuning command included `ipSetSize`, which is not a valid FelixConfiguration field in current Calico documentation. Removed it and kept the documented `prometheusMetricsEnabled` setting for observability.

## Review Notes
- The `calico-node-xxx` pod name and HostEndpoint node/interface/IP values are placeholders and must be replaced with real cluster values before applying the examples.
- `kubectl patch felixconfiguration` requires the Calico API resources to be available through the Kubernetes API server; Calico documentation also shows equivalent `calicoctl` usage.
