# Validation Summary: How to Configure Hierarchical Namespaces Using HNC for Delegated Administration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes namespaces
- Hierarchical Namespace Controller (HNC)
- HNC custom resources: HierarchyConfiguration, SubnamespaceAnchor, HNCConfiguration, HierarchicalResourceQuota
- Kubernetes RBAC, LimitRange, NetworkPolicy, ResourceQuota concepts
- kubectl and kubectl-hns plugin
- Python Kubernetes client
- PrometheusRule monitoring

## Sources Consulted
- HNC upstream repository and release information: https://github.com/kubernetes-sigs/hierarchical-namespaces
- HNC v1.1.0 release assets and manifests: https://github.com/kubernetes-sigs/hierarchical-namespaces/releases/tag/v1.1.0
- HNC User Guide, how-to documentation: https://github.com/kubernetes-sigs/hierarchical-namespaces/blob/master/docs/user-guide/how-to.md
- HNC v1.1.0 default manifest CRD schemas: https://github.com/kubernetes-sigs/hierarchical-namespaces/releases/download/v1.1.0/default.yaml
- HNC v1.1.0 HRQ manifest: https://github.com/kubernetes-sigs/hierarchical-namespaces/releases/download/v1.1.0/hrq.yaml
- HNC kubectl plugin source for available commands: https://github.com/kubernetes-sigs/hierarchical-namespaces/blob/master/internal/kubectl/root.go
- HNC metrics source: https://github.com/kubernetes-sigs/hierarchical-namespaces/blob/master/internal/stats/metrics.go
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found
- The installation command used the pre-v1.0 `hnc-manager.yaml` artifact for HNC v1.1.0. Updated it to use the v1.1.0 `default.yaml` release manifest.
- The post discussed hierarchical resource quotas using standard Kubernetes `ResourceQuota` objects. Updated the examples to use HNC's `HierarchicalResourceQuota` resource and added the optional v1.1.0 `hrq.yaml` installation command.
- The policy propagation section implied LimitRange and NetworkPolicy objects propagate automatically by default. HNC only propagates RBAC Roles and RoleBindings by default, so an `HNCConfiguration` example was added for `limitranges` and `networkpolicies`.
- The `HNCConfiguration` example used invalid `spec.types` entries with `apiVersion` and `kind`. Updated it to the valid `spec.resources` schema with `resource`, optional `group`, and `mode`.
- The `HNCConfiguration` example attempted to configure Roles and RoleBindings in `spec`; HNC enforces those as propagated and omits them from `spec`. Removed those invalid entries.
- The `kubectl hns list` command is not an HNC plugin command. Replaced it with `kubectl hns tree team-backend`.
- The Prometheus alert used a lowercase `condition` label and a nonexistent namespace label in the annotation. Updated the expression to use HNC's `Condition` label and changed the description to match the aggregate metric.
- The Python example imported `yaml` but did not use it. Removed the unused import to avoid an unnecessary dependency.
- The RBAC section described the example as granting namespace admin rights. Updated the wording to describe the actual permission being granted: subnamespace creation rights.

## Review Notes
HNC v1.1.0 is the latest upstream release, but the repository was archived in April 2025 and is read-only. The post is technically valid for HNC v1.1.0, with the caveat that hierarchical resource quotas are beta in that release.
