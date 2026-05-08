# Validation Summary: How to Validate Resolution of Felix Not Starting in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Felix
- Kubernetes NetworkPolicy
- kubectl
- iptables
- Prometheus metrics

## Sources Consulted
- Calico documentation: Configuring calico/node, node readiness: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation: FelixConfiguration health and metrics settings: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Felix Prometheus metrics reference: https://docs.tigera.io/calico-enterprise/latest/reference/component-resources/node/felix/prometheus
- Kubernetes documentation: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The readiness validation used `wget -qO- http://localhost:9099/readiness` and described the expected output as `200 OK`. Calico documents the `calico/node` exec readiness check with `/bin/calico-node -felix-ready`, so the command was changed to that documented check and the expected result was changed to a successful exit.
- The NetworkPolicy enforcement test used `ping`, but Kubernetes NetworkPolicy behavior for ICMP is undefined and plugin-dependent. The test was changed to use a TCP HTTP request to an `nginx:alpine` pod, which matches the protocols covered by Kubernetes NetworkPolicy.
- The Felix metric name was written as `felix_iptables_restore_errors_total`, but Calico's Felix metrics reference documents `felix_iptables_restore_errors`. The grep command was updated to use the documented metric name.

## Review Notes
The iptables chain checks are valid for Calico's iptables dataplane, but clusters using eBPF or nftables-oriented configurations may need dataplane-specific validation commands.
