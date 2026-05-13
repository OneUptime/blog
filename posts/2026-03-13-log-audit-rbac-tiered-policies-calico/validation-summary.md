# Validation Summary: How to Log and Audit RBAC for Calico Tiered Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico policy tiers
- Calico `projectcalico.org/v3` resources
- Kubernetes RBAC
- Kubernetes audit logging
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico RBAC for tiered policies: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico policy tiers: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/audit-annotations/

## Issues Found
- The original post treated RBAC for tiered policies as a traffic policy feature and used a Calico `NetworkPolicy` example. Replaced it with Kubernetes RBAC resources using Calico's documented `tiers`, `tier.networkpolicies`, and tier-qualified resource names.
- The original YAML did not configure RBAC or target a Calico tier. Replaced it with `ClusterRole`, `ClusterRoleBinding`, and `RoleBinding` objects. The cluster-scoped tier permission is bound with `ClusterRoleBinding`, while namespaced policy access is bound in the `production` namespace.
- The implementation steps used `calicoctl apply` and connectivity testing, which validate network policy behavior rather than RBAC access. Updated the commands to apply RBAC with `kubectl`, inspect RBAC objects, test access as the target user, and reference Kubernetes audit logs.
- The post referenced `calicoctl apply --dry-run`, but the official `calicoctl apply` reference does not document a dry-run flag. Replaced it with `kubectl apply --dry-run=server`.
- The Felix metric example `felix_denied` was not an appropriate RBAC audit signal. Replaced it with Kubernetes audit-log checks for authorization decisions.
- The architecture diagram described workload traffic enforcement by Felix rather than API authorization. Updated it to show Kubernetes RBAC, the Calico tiered policy API, audit events, and the native v3 CRD admission-webhook limitation.
- The common issues section focused on selectors, DNS, and traffic policy order. Replaced those with tier permission, pseudo resource, and native CRD read-enforcement caveats from Calico documentation.

## Review Notes
- Calico documents that `kubectl auth can-i` cannot be used to check RBAC for tiered policy, so the post uses an actual `kubectl get networkpolicies.p ... --as=john` request for validation.
- When using native `projectcalico.org/v3` CRDs, Calico tier RBAC is enforced for create, update, and delete by an admission webhook; GET, LIST, and WATCH are not enforced by admission webhooks because they cannot intercept read requests.
