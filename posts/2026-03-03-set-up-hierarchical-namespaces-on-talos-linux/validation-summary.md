# Validation Summary: How to Set Up Hierarchical Namespaces on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes namespaces
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota and LimitRange
- Hierarchical Namespace Controller (HNC)
- kubectl and kubectl-hns plugin
- Krew kubectl plugin manager

## Sources Consulted
- HNC v1.1.0 release page: https://github.com/kubernetes-sigs/hierarchical-namespaces/releases/tag/v1.1.0
- HNC User Guide, how-to documentation: https://github.com/kubernetes-sigs/hierarchical-namespaces/blob/master/docs/user-guide/how-to.md
- HNC repository README and archive status: https://github.com/kubernetes-sigs/hierarchical-namespaces
- HNC v1.1.0 default manifest: https://github.com/kubernetes-sigs/hierarchical-namespaces/releases/download/v1.1.0/default.yaml
- Kubernetes kubectl plugin documentation: https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/
- Krew installation documentation: https://krew.sigs.k8s.io/docs/user-guide/installing-plugins/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found
- The post implied NetworkPolicies are inherited by default. HNC v1.1.0 propagates Roles and RoleBindings by default; NetworkPolicy propagation must be configured. Updated the explanation and added a NetworkPolicy propagation command before the example relies on inherited NetworkPolicies.
- The HNC plugin installation example used `brew install kubectl-hns`, which is not the upstream documented installation path. Replaced it with the official Krew installation commands while keeping the direct download option.
- The propagation configuration examples set new resource types directly to `Propagate` without the documented `--force` flag or staged safety flow. Added `--force` to keep the commands functional as written.
- The list of propagation modes omitted `AllowPropagate`, which exists in HNC v1.1.0. Added it to the mode list.
- The exception annotation `hnc.x-k8s.io/exceptions` is not the documented HNC propagation annotation. Replaced it with `propagate.hnc.x-k8s.io/treeSelect: "!team-data"`.
- The delegated namespace creation RoleBinding referenced `hnc.x-k8s.io:admin`, which is not created by the HNC v1.1.0 manifest. Replaced it with the installed `hnc-admin-role` ClusterRole.
- The monitoring section used `kubectl hns config describe` to check namespace hierarchy issues. Updated it to `kubectl hns describe engineering`, which is the documented command for detailed namespace hierarchy conditions.
- The post did not mention that the upstream HNC repository is archived. Added a concise note that v1.1.0 is the latest release as of May 2026 and the repository is archived.

## Review Notes
- HNC v1.1.0 remains the latest upstream release, but the repository was archived in April 2025. Production users should consider the maintenance status before adopting it.
- HNC v1.1.0 includes beta HierarchicalResourceQuota support, but it is not installed by the default manifest. The post's guidance to use leaf namespace ResourceQuotas remains technically valid.
