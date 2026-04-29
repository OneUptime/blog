# Validation Summary: How to Manage Service Accounts with OpenTofu on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- Kubernetes
- HashiCorp Kubernetes provider
- Kubernetes ServiceAccounts

## Sources Consulted
- OpenTofu provider configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- HashiCorp Kubernetes provider documentation overview: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- HashiCorp Kubernetes provider `kubernetes_service_account_v1` documentation: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/service_account_v1.md
- HashiCorp Kubernetes provider `kubernetes_namespace_v1` documentation: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/namespace_v1.md
- Kubernetes Service Accounts concept documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Managing Service Accounts documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/

## Issues Found
- The post title and description were about Kubernetes service accounts, but the main example created a `kubernetes_deployment` instead. Replaced the deployment example with a `kubernetes_service_account_v1` example and kept the namespace resource as supporting context.
- The provider setup omitted a `required_providers` declaration even though the post described a complete OpenTofu configuration. Added a `terraform { required_providers { ... } }` block using the current Kubernetes provider major version line.
- The example used deployment-oriented variables and conclusion text that did not apply to service accounts. Removed irrelevant deployment/image/resource-limit variables and updated the conclusion to reflect namespace scope, RBAC, and current Kubernetes token guidance.
- The `kube_context` variable defaulted to `"default"`, which would try to select a kubeconfig context literally named `default`; current provider documentation says the provider uses the kubeconfig's default/current context only when `config_context` is omitted. Removed that misleading default and made `kube_context` an explicit input.
- The resource names were updated to current `*_v1` forms for the namespace and service account examples to align the post with the provider's current API-specific resource documentation.

## Review Notes
- No live `tofu validate` run was possible in this environment because the `tofu` CLI is not installed; validation was performed against official OpenTofu, provider, and Kubernetes documentation.
- The post now correctly covers service account creation, but workloads that need Kubernetes API access still require separate RBAC resources such as `Role`/`RoleBinding` or `ClusterRoleBinding` depending on the required scope.
- Current Kubernetes guidance favors short-lived tokens obtained through the TokenRequest API or projected service account tokens. Long-lived Secret-based service account tokens are legacy/manual behavior and should not be assumed.
