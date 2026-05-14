# Validation Summary: How to Migrate Existing Rules to Calico Tiered Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Calico tiered policy
- Kubernetes NetworkPolicy
- `calicoctl`
- `kubectl`
- YAML manifests

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico policy tiers guide: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The replacement Calico `NetworkPolicy` did not specify `spec.tier`, so it would be placed in Calico's default tier rather than demonstrating migration to a tiered policy. I added an explicit `Tier` resource and set `spec.tier: application` on the policy.
- The migration example did not define how unmatched traffic should continue to existing policies while the new tier is applied alongside old policies. I set the example tier's `defaultAction` to `Pass`, matching Calico's documented behavior for continuing evaluation into the next applicable tier.
- The inventory commands appended Kubernetes NetworkPolicy YAML and Calico NetworkPolicy YAML into one file, which can produce a confusing or invalid combined backup. I changed the commands to write separate backup files.
- The architecture diagram said "No Match / Deny" even though, with a tier `defaultAction: Pass`, unmatched traffic continues to the next tier. I updated the diagram to distinguish deny matches from no-match pass-through behavior.

## Review Notes
- The `calicoctl get networkpolicies --all-namespaces -o yaml`, `calicoctl apply -f`, and `kubectl delete networkpolicies --all -n production` command shapes are consistent with the official command references, although `calicoctl` and `kubectl` were not installed in this local workspace for live CLI help verification.
- Calico evaluates lower tier and policy `order` values first. Policies without an explicit tier are placed in the default tier, which has a fixed order of 1,000,000 in current Calico Open Source documentation.
