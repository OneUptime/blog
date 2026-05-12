# Validation Summary: How to Secure BGP to Workload Connectivity in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Project Calico)
- Kubernetes
- BGP (Border Gateway Protocol)
- Calico GlobalNetworkPolicy / NetworkPolicy (`projectcalico.org/v3`)
- Calico BGPFilter / BGPPeer resources
- `calicoctl`

## Sources Consulted
- Calico BGPFilter resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico API source: https://github.com/projectcalico/calico (api/pkg/apis/projectcalico/v3/bgpfilter.go)

## Issues Found
- **BGPFilter rule missing required `matchOperator`**: The original `BGPFilter` example specified `cidr: 10.48.0.0/16` on the Accept rule without a `matchOperator`. Calico's BGPFilter API enforces an `XValidation` rule that `cidr` and `matchOperator` must both be set or both be empty (the field doc explicitly states "Required when CIDR is set"). Without `matchOperator`, the resource would be rejected by the API server. Fixed by adding `matchOperator: In` to the Accept rule. The trailing `action: Reject` catch-all rule has no CIDR, so it remains valid.

## Review Notes
- The `GlobalNetworkPolicy` and namespaced `NetworkPolicy` examples are syntactically valid against the `projectcalico.org/v3` schema (selector, order, types, ingress action/source/destination/protocol/ports fields all correct).
- `BGPPeer.spec.filters` is a valid field, available since Calico v3.26 — readers on older Calico versions will need to upgrade.
- The introductory statement "By default, Calico allows all traffic unless deny policies exist" is accurate at the cluster-default level (endpoints with no matching policy allow traffic), though once any policy with `types: Ingress` selects an endpoint, unmatched ingress traffic is denied. This nuance isn't incorrect as written but is worth keeping in mind.
- The post mentions BGP MD5 authentication in the conclusion and architecture diagram but does not show how to configure it (`BGPPasswordSecret` / `password` on `BGPPeer`). Not an inaccuracy — just a future-improvement opportunity.
- The example pod CIDR (`10.48.0.0/16`) and service CIDR (`10.96.0.0/12`) are illustrative; readers must substitute their cluster's actual CIDRs.
