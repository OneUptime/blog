# Validation Summary: How to Migrate to Secured Calico Metrics Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Prometheus metrics
- calicoctl
- kubectl

## Sources Consulted
- Calico Open Source documentation: Secure Calico Prometheus endpoints - https://docs.tigera.io/calico/latest/network-policy/comms/secure-metrics
- Calico Open Source documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics

## Issues Found
- The original GlobalNetworkPolicy selected `calico-node` pods with `k8s-app == 'calico-node'`, but Calico's documented pattern for securing Felix metrics on node port 9091 uses HostEndpoints for Calico nodes. Updated the prerequisites and policy selector to use HostEndpoints labeled `running-calico == "true"`.
- The original policy used allow rules followed by a broad deny rule without documenting the HostEndpoint setup required for host-level metrics protection. Replaced it with the documented deny-list pattern using `notSelector: calico-prometheus-access == "true"` on TCP port 9091.
- The original implementation steps tested Prometheus access but never applied the label required by the policy. Added a `kubectl label pod` command for the Prometheus pod.
- The original verification section referenced `/var/log/calico/flow-logs/*.log`, which is not part of the standard Calico Open Source secure metrics workflow, and checked namespaced NetworkPolicies even though the snippet creates a GlobalNetworkPolicy. Replaced those commands with `calicoctl get globalnetworkpolicy secure-calico-metrics -o yaml` and a label check for the Prometheus pod.

## Review Notes
- The post now documents the Calico Open Source deny-list approach for Felix metrics on port 9091. Typha metrics on port 9093 and kube-controllers metrics on port 9094 require separate policies if those endpoints are enabled.
- Local `calicoctl` and `kubectl` binaries were not available in the workspace, so command behavior was checked against official Calico documentation rather than local CLI help.
