# Validation Summary: How to Debug RBAC for Calico Tiered Policies When Access Is Blocked

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source tiered network policy
- Calico `projectcalico.org/v3` API resources
- Kubernetes RBAC
- `calicoctl` and `kubectl`
- Felix Prometheus metrics

## Sources Consulted
- Calico: Configure RBAC for tiered policies: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico: Get started with policy tiers: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico: Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico: NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico: GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico: `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Project Calico API Go reference for `NetworkPolicySpec.tier`: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3

## Issues Found
- The post described RBAC for tiered policies as traffic enforcement. Updated the description and introduction to clarify that RBAC controls who can manage Calico policies and tiers, while the policies themselves control traffic.
- The main YAML example only defined a Calico `NetworkPolicy` and did not configure RBAC or an explicit tier. Added a `Tier`, Kubernetes `ClusterRole`, `ClusterRoleBinding`, `RoleBinding`, and `spec.tier` on the policy using Calico's documented pseudo-resources.
- The implementation used `calicoctl apply` for a file that now includes Kubernetes RBAC resources. Updated it to `kubectl apply`, which can apply both Kubernetes RBAC resources and Calico CRDs.
- The verification commands used an inconsistent policy name and checked a non-existent `felix_denied` metric. Updated the commands to use the actual policy name and documented Felix metrics names.
- The selector troubleshooting command used a placeholder that was not valid as a Kubernetes label selector. Replaced it with `kubectl get pods -l app=authorized-source`.
- Added the documented caveat that native v3 CRDs do not enforce tier-specific GET/LIST/WATCH checks through admission webhooks and that `kubectl auth can-i` should not be used to validate tiered policy RBAC.

## Review Notes
The corrected post is accurate for current Calico documentation. Future improvements could add separate examples for Calico API server versus native v3 CRD installations, because tiered policy read behavior differs between those modes.
