# Validation Summary: Common Mistakes to Avoid with Calico Policy Log Rules

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source network policy
- Calico `NetworkPolicy` and `GlobalNetworkPolicy`
- Calico policy `Log`, `Allow`, and `Deny` actions
- `calicoctl`
- Kubernetes pods and label selectors

## Sources Consulted
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: calicoctl user reference and resource aliases - https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: calicoctl get command - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Troubleshooting commands for network policy output - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes documentation: kubectl get - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: Labels and selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The introduction described Calico Policy Log Rules as providing fine-grained security controls. Calico policy rules provide enforcement, while the `Log` action is diagnostic and continues evaluation with the next rule. Updated the introduction to distinguish enforcement from logging visibility and to state that evaluation continues after `Log`.
- The policy order command sorted namespace-scoped `calicoctl get networkpolicies -n production -o wide` output by the fourth column. Official troubleshooting output shows namespace-scoped wide output uses `NAME`, `ORDER`, `SELECTOR`, so `ORDER` is the second column. Changed the command to `sort -k2 -n`.
- The bidirectional rules section stated that both ingress and egress must always be permitted. Calico follows Kubernetes pod policy behavior: traffic is allowed by default until policies select the relevant endpoint and direction. Updated the wording to say both directions must be permitted when policies select both sides of a connection.

## Review Notes
The DNS allow snippets are valid Calico rule fragments for UDP and TCP port 53, but production policies often narrow DNS egress to the cluster DNS service or DNS pods instead of allowing all destinations on port 53.
