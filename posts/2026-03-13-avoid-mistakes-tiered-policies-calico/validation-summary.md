# Validation Summary: Common Mistakes to Avoid with Calico Tiered Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes
- Calico `NetworkPolicy`, `GlobalNetworkPolicy`, and tiered policies
- `calicoctl`
- `kubectl`

## Sources Consulted
- Calico Tier resource documentation: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico network policy getting started guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico troubleshooting commands documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico tiered policy RBAC documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies

## Issues Found
- The post stated that both ingress on the destination and egress on the source "must" be permitted. Calico follows Kubernetes pod network policy behavior for pods: unrestricted traffic is allowed when no policy applies to that direction, and traffic is restricted only when one or more applicable policies contain rules for that direction. I changed the statement to apply when policies are present for both directions.

## Review Notes
- The `calicoctl get networkpolicies -n production -o wide` pattern is consistent with Calico troubleshooting documentation for checking policy selectors and order. `calicoctl` is not installed in this workspace, so the command was verified against official documentation rather than local help output.
- The DNS egress allow snippets use valid Calico rule fields and protocols, but production policies commonly restrict those rules further to the cluster DNS service or CoreDNS/kube-dns endpoints instead of allowing all destination port 53 traffic.
