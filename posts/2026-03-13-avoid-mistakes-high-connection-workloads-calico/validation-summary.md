# Validation Summary: Common Mistakes to Avoid with Calico High-Connection Workload Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Calico FelixConfiguration
- Linux conntrack

## Sources Consulted
- Calico high-connection workload guidance: https://docs.tigera.io/calico/latest/network-policy/extreme-traffic/high-connection-workloads
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico component metrics monitoring: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico conntrack reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/conntrack

## Issues Found
- The original core policy was a normal namespaced Calico NetworkPolicy. That is valid policy syntax, but it does not implement Calico's documented high-connection workload pattern for bypassing Linux conntrack. Replaced it with a HostEndpoint plus GlobalNetworkPolicy using `doNotTrack: true` and `applyOnForward: true`, which is the documented approach for selected high-connection host endpoint traffic.
- The original high-connection policy did not include explicit return traffic for untracked policy. Added a symmetrical egress rule because Calico `doNotTrack` policies are stateless and do not rely on conntrack to allow return packets automatically.
- The original Felix patch used `ipSetSize`, which is not a documented FelixConfiguration field. Removed it.
- The original Felix patch used `maxIpsetSize` as if it tuned connection capacity. That field controls the maximum number of IP addresses in an IP set and is not a Linux conntrack capacity setting. Removed it from the performance tuning snippet.
- The original `kubectl exec` command used a placeholder pod name without specifying the `calico-node` container. Updated it to use `<calico-node-pod>` and `-c calico-node` so it is clearer for common Calico pod layouts.

## Review Notes
Creating a HostEndpoint can change default host interface policy behavior, so production deployments should verify all required host traffic is explicitly allowed or covered by appropriate host endpoint profiles and policies. The example uses placeholder node names, interface names, IPs, labels, and service ports that must be adjusted before applying it to a real cluster.
