# Validation Summary: Use Calico Tier Resource

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source tiered network policy
- Calico Tier resources
- Calico GlobalNetworkPolicy resources
- Calico calicoctl CLI
- Kubernetes RBAC

## Sources Consulted
- Calico Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico policy tiers guide: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico RBAC for tiered policies guide: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The post stated that the default tier already exists at order `1000`. Current Calico documentation states that the default tier has fixed order `1,000,000`, so the comment was updated.
- The security tier example described unmatched traffic passing to lower tiers, but the ingress rules did not include a `Pass` rule. Calico tiers have an implicit default deny unless traffic is explicitly passed or the tier default action is `Pass`, so an ingress `Pass` rule was added.
- The platform tier example also described unmatched traffic passing to lower tiers, but its ingress rules did not include a `Pass` rule. A trailing ingress `Pass` rule was added.
- The namespace selector used `kubernetes.io/metadata.name` for the monitoring namespace. Calico documentation recommends selecting a namespace by name with `projectcalico.org/name`, so the selector was corrected.
- The calicoctl JSON parsing example assumed a Kubernetes-style object with an `items` field. Calico documentation describes JSON output as JSON dictionaries/lists, so the Python snippet was made tolerant of either a top-level `items` object or a top-level list.
- The RBAC example granted broad access to `globalnetworkpolicies`, `networkpolicies`, and `tiers` rather than per-tier policy access. Calico documentation specifies pseudo resources such as `tier.globalnetworkpolicies` and `tier.networkpolicies` with `resourceNames` like `security.*`, so the example was updated accordingly.

## Review Notes
The examples are now aligned with current Calico Open Source documentation. In a real cluster, teams should test RBAC behavior with their datastore/API-server mode because Calico's native v3 CRD and API server configurations can affect how tier RBAC is enforced.
