# Validation Summary: How to Create RBAC Roles and Bindings with OpenTofu on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Kubernetes
- Kubernetes RBAC
- HashiCorp Kubernetes provider
- HCL

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu CLI overview: https://opentofu.org/docs/cli/commands/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/cli/commands/apply
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- HashiCorp Kubernetes provider overview: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/index.md
- `kubernetes_namespace_v1` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/namespace_v1.md
- `kubernetes_service_account_v1` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/service_account_v1.md
- `kubernetes_role_v1` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/role_v1.md
- `kubernetes_role_binding_v1` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/role_binding_v1.md
- `kubernetes_cluster_role_v1` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/cluster_role_v1.md
- `kubernetes_cluster_role_binding_v1` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/cluster_role_binding_v1.md

## Issues Found
- The post title and description promised RBAC coverage, but the original examples created a namespace, resource quota, deployment, and service instead of any RBAC objects. I replaced those snippets with `kubernetes_namespace_v1`, `kubernetes_service_account_v1`, `kubernetes_role_v1`, `kubernetes_cluster_role_v1`, `kubernetes_role_binding_v1`, and `kubernetes_cluster_role_binding_v1` so the implementation now matches the topic and official provider resources.
- The provider block pinned `hashicorp/kubernetes` to `~> 2.0`, which is not current in the official registry documentation. I updated it to `~> 3.0` and used the documented `_v1` resource types throughout the examples.
- The original defaults were brittle for real clusters: `namespace = "default"` would attempt to create the existing `default` namespace, and `config_context = "default"` assumed a kubeconfig context name that often does not exist. I changed the namespace default to `rbac-demo` and simplified the provider configuration to use the kubeconfig's current context.
- The best-practices and conclusion sections discussed workload probes, resource quotas, and container security rather than RBAC behavior. I corrected them to RBAC-specific guidance, including least privilege, ServiceAccount binding, namespace scoping, reusable ClusterRoles, and additive permissions.

## Review Notes
- `tofu` and `terraform` are not installed in this workspace, so I could not run a local CLI validation pass. The review was completed against official OpenTofu, Kubernetes, and provider documentation.
- The official provider documentation currently shows the HashiCorp Kubernetes provider in the 3.0 line. Teams pinned to older 2.x provider versions may need to adjust version constraints or resource naming to match their environment.
