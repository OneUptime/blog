# Validation Summary: Audit Calico Tier Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source tiered network policy
- Calico `Tier` and `GlobalNetworkPolicy` resources
- Kubernetes RBAC
- `calicoctl`, `kubectl`, Bash, and Python

## Sources Consulted
- Calico Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico policy tiers guide: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico RBAC for tiered policies: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico `calicoctl` user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post used `default=1000` as the expected Calico default tier order. Calico documentation states the default tier is created with fixed order `1,000,000`, so the audit script and report template were updated to use `1000000`.
- The tier-order audit sorted tiers with missing `spec.order` as `9999`. Calico documents a missing tier order as lowest precedence, so the sort fallback was changed to `float('inf')`.
- The RBAC audit used `kubectl auth can-i` to check Calico tiered policy RBAC. Calico documentation states that `kubectl auth can-i` cannot be used to check RBAC for tiered policy, so the example was changed to inspect Role and ClusterRole rules for broad write access to `tiers`, `tier.globalnetworkpolicies`, and `tier.networkpolicies`.
- The prerequisites did not mention `kubectl`, even though the RBAC audit requires it. Added `kubectl` with RBAC read access to the prerequisites.

## Review Notes
The RBAC audit is a useful static check for broad grants, but a full access review should also trace RoleBinding and ClusterRoleBinding subjects and compare them against the intended security-team ownership model.
