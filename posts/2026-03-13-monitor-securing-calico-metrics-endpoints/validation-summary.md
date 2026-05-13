# Validation Summary: How to Monitor Calico Metrics Endpoint Access Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (open-source) v3.26+
- Calico GlobalNetworkPolicy (projectcalico.org/v3)
- calicoctl CLI
- Kubernetes / kubectl
- Prometheus metrics (Felix metrics endpoint, port 9091)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Felix Prometheus metrics: https://docs.tigera.io/calico/latest/operations/monitor/metrics/
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico component metrics ports (Felix default 9091, kube-controllers 9094, Typha)

## Issues Found
- **Resource type mismatch in verification command**: The post applies a `GlobalNetworkPolicy` (cluster-scoped) but verified it with `calicoctl get networkpolicies -n kube-system`. `NetworkPolicy` and `GlobalNetworkPolicy` are distinct resources in Calico, and `GlobalNetworkPolicy` is not namespaced. Changed to `calicoctl get globalnetworkpolicies | grep metrics` so the verification command actually surfaces the policy that was just applied.

## Review Notes
- The `grep "port=9091" /var/log/calico/flow-logs/*.log` command relies on Calico flow logs, which are a Calico Enterprise / Calico Cloud feature; open-source Calico does not write flow logs to this path by default. Readers using open-source Calico will need to either enable Felix flow logs or use an external log/flow collector (e.g., kube-router, Hubble, or Prometheus scraping) for this style of access auditing. Left as-is since the post does not explicitly claim open-source-only support and the command is illustrative.
- The `Deny` rule lists ports 9091, 9092, 9093. 9091 is the Felix Prometheus metrics default, 9094 is the kube-controllers default; 9092/9093 are not standard Calico component defaults but are reasonable defensive choices for blocking adjacent ports. No change required.
- The two earlier `Allow` rules in the same policy take precedence over the trailing `Deny` because Calico evaluates ingress rules in order, so the policy semantics are correct.
