# Validation Summary: How to Test Calico Metrics Endpoint Security with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Kubernetes
- kubectl
- calicoctl
- Prometheus metrics
- Calico Whisker flow logs

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoint policy overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico host endpoint policy summary: https://docs.tigera.io/calico/latest/reference/host-endpoints/summary
- Calico component metrics monitoring: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Whisker flow logs documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The original GlobalNetworkPolicy selected `k8s-app == 'calico-node'`, which is not sufficient for securing Felix metrics on node interfaces. Calico host traffic is enforced through HostEndpoint resources, so the post now states that HostEndpoints must exist and labels them with `role == 'calico-node'` for the policy selector.
- The policy rules matched destination ports without an explicit protocol. Calico examples and rule definitions use protocol-specific port matches, so each metrics rule now specifies `protocol: TCP`.
- The verification command piped `kubectl exec ... curl` into `head`, which would report the pipeline status rather than clearly preserving the curl/kubectl result. The command now writes the metrics output to a local file, prints the status, and then displays the first five lines.
- The unauthorized curl test used a placeholder hostname and did not fail on HTTP errors. The post now uses a `NODE_IP` variable and `curl -fsS` with connection and total timeouts.
- The flow log check referenced `/var/log/calico/flow-logs/*.log`, which is not the documented Calico Open Source flow log interface. It now points readers to Calico Whisker via the documented `kubectl port-forward` workflow.
- The policy listing command used `calicoctl get networkpolicies -n kube-system`, but the example creates a non-namespaced GlobalNetworkPolicy. It now uses `calicoctl get globalnetworkpolicies`.

## Review Notes
The corrected policy assumes the cluster has HostEndpoint resources for the relevant node interfaces and that those HostEndpoints are labeled consistently. The example still uses a representative `NODE_IP` value and pod names that readers must replace with values from their own cluster.
