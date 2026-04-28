# Validation Summary: How to Configure the Kubernetes Backend in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenTofu (Kubernetes backend)
- Terraform (compatibility — `terraform {}` block)
- Kubernetes (Secrets, Leases, Namespaces, ServiceAccounts, RBAC Roles/RoleBindings)
- HCL configuration
- kubectl CLI

## Sources Consulted
- OpenTofu Kubernetes Backend documentation: https://opentofu.org/docs/language/settings/backends/kubernetes/
- OpenTofu source — Kubernetes backend client: https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/kubernetes/client.go
- OpenTofu source — Kubernetes backend schema: https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/kubernetes/backend.go
- Kubernetes RBAC documentation (apiGroups, verbs for `secrets` and `coordination.k8s.io/leases`)

## Issues Found
No technical issues found.

Key claims verified against the OpenTofu source/docs:
- Secret naming convention `tfstate-{workspace}-{secret_suffix}` is correct, so `tfstate-default-production` is accurate for the default workspace.
- The label selector `app.kubernetes.io/managed-by=terraform` used in the `kubectl get secrets` example is a real default label applied by the backend's `getLabels()` (alongside `tfstate=true`, `tfstate-secret-suffix`, and `tfstate-workspace`).
- `load_config_file` defaults to `true` (via `KUBE_LOAD_CONFIG_FILE`), so the explicit `load_config_file = true` in the basic example is redundant but not incorrect.
- `in_cluster_config`, `config_path`, `config_context`, `namespace`, and `secret_suffix` are all valid backend arguments.
- RBAC verbs for `secrets` (get/create/update/delete/list) and `coordination.k8s.io/leases` (get/create/update/delete) are sufficient for state read/write and lock acquisition/renewal/release.
- Environment variables `KUBE_CONFIG_PATH` and `KUBE_CONTEXT` are recognized by the backend.
- The `terraform {}` block is supported by OpenTofu for backwards compatibility.
- The note on encryption-at-rest depending on cluster configuration is accurate (Secrets are base64-encoded by default; encryption-at-rest must be configured at the etcd/apiserver level).

## Review Notes
- The basic example sets `load_config_file = true`, which is the default. Authors could omit this without changing behavior, but leaving it explicit is fine for documentation clarity.
- The post does not mention the `config_paths` (plural) argument, which is also supported for multiple kubeconfig files. Not a defect — single-path coverage is sufficient for an introductory guide.
- The lease RBAC could optionally include `list` if tooling needs to enumerate locks, but the listed verbs are correct for normal state-locking operation.
- Workspace creation example (`tofu workspace new`) is correct; new workspaces produce additional `tfstate-{workspace}-{suffix}` secrets as described.
