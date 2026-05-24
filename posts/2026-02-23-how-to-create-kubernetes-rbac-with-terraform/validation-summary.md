# Validation Summary: How to Create Kubernetes RBAC with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL syntax, variables, locals, for_each loops)
- hashicorp/kubernetes Terraform provider (~> 2.0)
- Kubernetes RBAC (Roles, ClusterRoles, RoleBindings, ClusterRoleBindings)
- Kubernetes Service Accounts
- Kubernetes Aggregated ClusterRoles
- Kubernetes API groups: core (""), apps, batch, networking.k8s.io, metrics.k8s.io, rbac.authorization.k8s.io

## Sources Consulted
- Terraform Kubernetes Provider docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
  - `kubernetes_role`, `kubernetes_role_binding`, `kubernetes_cluster_role`, `kubernetes_cluster_role_binding`, `kubernetes_service_account`, `kubernetes_namespace` resource schemas
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes API reference for API groups and resources
- Kubernetes Metrics API documentation

## Issues Found
No technical issues found.

Specifically verified:
- The `kubernetes_role` resource correctly uses `metadata`, `rule { api_groups, resources, verbs, resource_names }` block structure.
- The `kubernetes_role_binding` and `kubernetes_cluster_role_binding` resources correctly use singular `subject` blocks and `role_ref` blocks with `api_group`, `kind`, `name`.
- The `aggregation_rule { cluster_role_selectors { match_labels } }` nested block structure is correct for `kubernetes_cluster_role`.
- The `kubernetes_service_account` metadata correctly nests `annotations` inside the `metadata` block.
- Provider source `hashicorp/kubernetes` with version constraint `~> 2.0` is valid and current.
- All referenced API groups and their resources are accurate: core (`pods`, `pods/log`, `pods/exec`, `services`, `endpoints`, `configmaps`, `secrets`, `namespaces`, `nodes`, `events`), `apps` (deployments, statefulsets, daemonsets, replicasets), `batch` (jobs, cronjobs), `networking.k8s.io` (ingresses, networkpolicies), `metrics.k8s.io` (pods, nodes).
- All RBAC verbs (get, list, watch, create, update, patch, delete) are standard.
- The `for_each` loop pattern with `map(object({...}))` typed variable is valid Terraform syntax.

## Review Notes
- The `~> 2.0` version constraint is broad but valid; readers may want to pin to a more specific minor version (e.g., `~> 2.30`) for reproducibility, though this is a stylistic choice, not a technical error.
- Including `list`, `watch`, `create`, `update`, `delete` verbs alongside `get` for `pods/log` and `pods/exec` subresources is harmless but only `get` (for `pods/log`) and `create` (for `pods/exec`) are functionally meaningful — Kubernetes simply ignores irrelevant verbs on subresources. This is not an error.
- The aggregated ClusterRole pattern (rules omitted, populated by the controller from matching labels) is correctly demonstrated.
