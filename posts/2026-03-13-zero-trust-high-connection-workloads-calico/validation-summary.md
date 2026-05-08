# Validation Summary: Zero Trust Security for High-Connection Workloads with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico HostEndpoint
- Calico FelixConfiguration
- Linux conntrack

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico high-connection workload guidance: https://docs.tigera.io/calico/latest/network-policy/extreme-traffic/high-connection-workloads
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico component metrics monitoring: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico conntrack reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/conntrack

## Issues Found
- The original policy was a normal namespaced Calico NetworkPolicy and did not implement Calico's documented high-connection workload optimization. Replaced it with a HostEndpoint plus GlobalNetworkPolicy using `doNotTrack: true` and `applyOnForward: true`, which is the documented Calico pattern for bypassing Linux conntrack for selected high-connection host endpoint traffic.
- The original Felix patch used `ipSetSize`, which is not a documented FelixConfiguration field. Removed it.
- The original Felix patch used `maxIpsetSize` as if it tuned connection capacity. That field controls the maximum number of IP addresses in an IP set and is not a Linux conntrack capacity setting. Removed it from the performance tuning snippet.
- The original `kubectl exec` command used a placeholder pod name without specifying the `calico-node` container. Updated it to use `<calico-node-pod>` and `-c calico-node` so it is clearer for multi-container Calico node pods.

## Review Notes
The corrected `doNotTrack` policy is stateless, so it includes symmetrical ingress and egress rules for return traffic. Creating a HostEndpoint can change default host interface policy behavior, so production deployments should verify all required host traffic is explicitly allowed or covered by appropriate host endpoint profiles and policies.
