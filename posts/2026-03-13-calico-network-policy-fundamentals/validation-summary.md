# Validation Summary: How to Understand Network Policy Fundamentals in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes NetworkPolicy
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- Calico policy tiers
- Calico selectors and rule actions

## Sources Consulted
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Tier resource documentation: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico policy tiers documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The GlobalNetworkPolicy scope table said it applies to all namespaces. Updated it to note that GlobalNetworkPolicy applies across namespaces and can also select host endpoints, matching Calico's resource documentation.
- The `all()` selector description was pod-only and too broad for GlobalNetworkPolicy. Updated it to say it matches endpoints in the applicable scope.
- The action list omitted `Log`, which is a valid Calico rule action. Updated the action list to include `Log`.
- The policy tiers section described tiers as an Enterprise feature. Current Calico Open Source documentation includes tiers, so the wording was changed to "Calico features."
- The `Pass` action wording implied a next-tier jump in all contexts. Updated it to describe next-tier behavior specifically in tiered policy.
- The default deny section implied a simple merge model for Calico and Kubernetes policies. Updated it to distinguish Kubernetes additive policy semantics from Calico tier/order-based evaluation.
- The conclusion said policies in the same tier use independent union semantics. Updated it to say same-tier Calico policies are evaluated in policy order.

## Review Notes
The examples use current `projectcalico.org/v3` Calico resources and `networking.k8s.io/v1` Kubernetes NetworkPolicy terminology. The post remains a fundamentals guide rather than a version-specific reference.
