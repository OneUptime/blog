# Validation Summary: How to Log and Audit Calico Metrics Endpoint Access

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico GlobalNetworkPolicy
- Calico HostEndpoints
- Kubernetes
- Prometheus metrics
- Calico Whisker flow logs

## Sources Consulted
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Protect Kubernetes nodes with HostEndpoints - https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico documentation: HostEndpoints overview - https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico documentation: View flow logs in Calico Whisker - https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico documentation: Enable flow logs API and Calico Whisker - https://docs.tigera.io/calico/latest/observability/enable-whisker

## Issues Found
- The original policy selected `k8s-app == 'calico-node'`, which would not correctly protect Felix metrics exposed from the host network. I changed the example to target HostEndpoints with `selector: has(kubernetes-host)` and added prerequisites/commands for automatic HostEndpoints and node labeling.
- The rules used destination ports without explicitly setting `protocol: TCP`. I added `protocol: TCP` to the allow and deny rules because Felix metrics are served over TCP and Calico examples use protocol when matching ports.
- The post claimed Calico v3.26+ was sufficient for flow-log auditing through the shown workflow. I updated the prerequisite to Calico v3.30+ for Calico Open Source Whisker flow logs.
- The verification command used a non-documented local path, `/var/log/calico/flow-logs/*.log`. I replaced it with the documented Whisker port-forward command and instruction to filter for destination port 9091.
- The policy verification command used `calicoctl get networkpolicies -n kube-system`, but the example creates a non-namespaced `GlobalNetworkPolicy`. I changed it to `calicoctl get globalnetworkpolicies | grep secure-calico-metrics`.
- The curl examples used `calico-node-ip` as if it were a resolvable host. I changed it to the placeholder `<node-ip>` to make the required substitution explicit.

## Review Notes
The corrected policy assumes HostEndpoints are in place and that host endpoint policy is appropriate for the cluster. Enabling HostEndpoints can affect host traffic broadly, so production deployments should include the cluster's required node, Kubernetes, and Calico control-plane allow rules before enforcing restrictive host policies.
