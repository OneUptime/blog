# Validation Summary: Common Mistakes to Avoid When Securing Calico Metrics Endpoints

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Felix Prometheus metrics
- Prometheus
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Secure Calico Prometheus endpoints - https://docs.tigera.io/calico/latest/network-policy/comms/secure-metrics
- Calico documentation: Global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The original GlobalNetworkPolicy selected `k8s-app == 'calico-node'`, which is not the documented approach for protecting Calico node metrics exposed on host endpoints. Changed the policy to select HostEndpoint resources labeled `running-calico == "true"` and added a prerequisite for those HostEndpoint resources.
- The policy did not specify `protocol: TCP` on port-based rules. Calico examples for port-specific metrics policies include TCP, so the rules now explicitly match TCP traffic to port 9091.
- The access selector used `app == 'prometheus'`, while the surrounding guidance did not instruct readers to apply that label. Changed it to the documented `calico-prometheus-access == "true"` label pattern.
- The deny rule listed ports 9092 and 9093 while the example only covered Felix metrics on port 9091. Narrowed the rule to 9091 to match the section's stated scope.
- The example commands used `calico-node-ip` as if it were a literal DNS name. Changed it to `<calico-node-ip>` to make clear it is a placeholder.
- The verification section used `calicoctl get networkpolicies -n kube-system`, but Calico GlobalNetworkPolicy resources are not returned by `calicoctl get networkpolicy`. Changed the command to query `globalnetworkpolicy secure-calico-metrics`.
- The flow-log grep example assumed local log files under `/var/log/calico/flow-logs/*.log`, which is not a documented Calico Open Source verification method for this setup. Replaced it with direct policy and label verification commands.

## Review Notes
The post now validates technically as a focused example for Felix metrics on port 9091. Deployments that also expose Typha or kube-controllers metrics need separate policies for their documented ports.
