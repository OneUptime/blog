# Validation Summary: How to Validate Calico Metrics Endpoint Security Before Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Kubernetes
- Prometheus metrics scraping
- calicoctl and kubectl

## Sources Consulted
- Calico documentation: Secure Calico Prometheus endpoints, https://docs.tigera.io/calico/latest/network-policy/comms/secure-metrics
- Calico documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Global network policy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Protect Kubernetes nodes with host endpoints, https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes

## Issues Found
- The original GlobalNetworkPolicy selected `k8s-app == 'calico-node'`, which does not match Calico's documented host endpoint approach for securing node-local Felix metrics. I changed the policy to select HostEndpoints labeled `running-calico == 'true'` and added the HostEndpoint prerequisite.
- The original allow/deny rules used namespace and pod selectors for Prometheus access but did not match Calico's documented metrics protection pattern. I changed the rule to deny TCP access to port 9091 from sources that do not have `calico-prometheus-access == 'true'`, and added the command to label the authorized Prometheus pod.
- The verification commands used `calico-node-ip` as a literal-looking hostname and piped curl output in a way that could hide curl failures. I changed the examples to use `<node-ip>`, `curl -fsS --max-time 5`, and a shell-wrapped authorized scrape.
- The policy inspection command used namespaced `networkpolicies` even though the example creates a `GlobalNetworkPolicy`. I changed it to `calicoctl get globalnetworkpolicy secure-calico-metrics -o yaml`.
- The flow-log verification command referenced `/var/log/calico/flow-logs/*.log`, which is not a standard Open Source Calico validation path for this setup. I replaced it with a host endpoint selection check.

## Review Notes
- Felix metrics are disabled by default and must be enabled before this validation can succeed. The post assumes metrics are already exposed.
- Calico installations may use `calico-system` or `kube-system` depending on installation method, so example pod and namespace names should be adapted to the cluster.
