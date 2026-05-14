# Validation Summary: Common Mistakes to Avoid with Zero Trust Network Policy in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy and NetworkPolicy
- Kubernetes network policy behavior
- Kubernetes kubectl
- Zero trust network segmentation

## Sources Consulted
- Calico documentation: GlobalNetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: NetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Enable a default deny policy for Kubernetes pods: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico documentation: Get started with Calico network policy: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: Use log rules to test network policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Kubernetes documentation: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction claimed Calico policy resources provide "comprehensive logging of every traffic decision." Calico supports `Log` actions for matching traffic, but policies do not comprehensively log every decision by default. Changed this to describe optional log rules for observing selected traffic.
- The default-deny verification command used `random-ip` as a hostname, which would primarily test DNS resolution rather than Calico policy enforcement. Changed it to a placeholder service name that represents a real service with no allow rule.
- The lateral movement check used `curl` with an HTTP URL against port 5432. Port 5432 is commonly PostgreSQL and is not an HTTP endpoint, so this could fail for application protocol reasons rather than network policy. Changed it to a TCP connection check with `nc`.

## Review Notes
The Calico policy YAML uses current `projectcalico.org/v3` resource shapes, valid `types`, selectors, `order`, and rule fields. The examples remain illustrative and require matching pod labels, service names, and a container image that includes the test tools used by the verification commands.
