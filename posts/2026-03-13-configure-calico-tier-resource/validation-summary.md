# Validation Summary: Configure Calico Tier Resource

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico tiered network policy
- Kubernetes NetworkPolicy and RBAC
- Calico GlobalNetworkPolicy
- calicoctl
- YAML configuration

## Sources Consulted
- Calico Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico tiered policy guide: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico-cloud/reference/resources/globalnetworkpolicy
- Calico tiered policy RBAC guide: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post stated that Tier resources require Calico Enterprise or Calico Cloud. Current Calico documentation includes tiered policy in Calico Open Source, so the prerequisite was broadened to "Calico with tiered policy support."
- The post listed the default tier order as 1000. Current Calico documentation states that the default tier order is 1,000,000, so all references and the diagram were updated.
- The tier evaluation explanation said unmatched traffic implicitly passes to the next tier. Calico tiers have an implicit default deny when a tier applies but no action is taken, unless the tier's `defaultAction` is `Pass`. The explanation was corrected, and the example custom tiers now set `defaultAction: Pass`.
- The RBAC example used plain `globalnetworkpolicies` and `networkpolicies` resources for per-tier access. Calico's tiered RBAC documentation uses the pseudo-resources `tier.globalnetworkpolicies` and `tier.networkpolicies`, and users also need `get` access to the tier. The snippet was updated accordingly.

## Review Notes
The remaining examples use valid Calico `projectcalico.org/v3` resource shapes and valid `calicoctl get` syntax. The platform tier section could add a matching `calicoctl apply` command in a future editorial pass for consistency, but that is a completeness issue rather than a technical correctness problem.
