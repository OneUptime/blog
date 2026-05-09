# Validation Summary: How to Test Calico Tiered Policies with Real Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico policy tiers
- Calico NetworkPolicy and GlobalNetworkPolicy resources
- Kubernetes
- kubectl
- wget-based traffic testing

## Sources Consulted
- Calico Tier resource documentation: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico policy tiers guide: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Tigera Calico Fall 2024 enhancements announcement: https://www.tigera.io/blog/whats-new-in-calico-fall-2024-enhancements-for-kubernetes-networking-and-security/

## Issues Found
- The security tier example did not include pass behavior. Calico tiers default to `Deny` when a tier applies to an endpoint but no rule takes action, so the staging test traffic would have been dropped in the security tier instead of reaching the application tier. Added `defaultAction: Pass` to the `security` Tier so non-matching traffic proceeds to the lower-priority application tier as the text and diagram describe.
- The prerequisite stated "Calico v3.26+ (Enterprise for tiered policies)", which is outdated for current Calico Open Source. Updated it to require Calico policy tier support and note Calico Open Source v3.29+ or Calico Enterprise/Cloud.

## Review Notes
- The manifests use the current `projectcalico.org/v3` API and valid `Tier`, `GlobalNetworkPolicy`, and `NetworkPolicy` fields.
- The traffic test assumes that `prod-pod`, `monitor-pod`, and `other-pod` exist, that the monitoring source pod has a label matching `tier == 'monitoring'`, and that the target pod is listening on the tested ports.
