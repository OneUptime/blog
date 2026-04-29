# Validation Summary: How to Manage Rbac Roles with OpenTofu on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Kubernetes provider
- Kubernetes namespaces
- Kubernetes RBAC Roles

## Sources Consulted
- OpenTofu provider requirements documentation: https://opentofu.org/docs/v1.9/language/providers/requirements/
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- Kubernetes provider documentation: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/index.md
- Kubernetes provider `kubernetes_namespace_v1` resource docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/namespace_v1.md
- Kubernetes provider `kubernetes_role_v1` resource docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/role_v1.md
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC good practices: https://kubernetes.io/docs/concepts/security/rbac-good-practices/
- Kubernetes provider release notes for v3.0.0 deprecations and v3.1.0 current release: https://github.com/hashicorp/terraform-provider-kubernetes/releases

## Issues Found
1. The post claimed to cover Kubernetes RBAC Roles, but the main example created a `kubernetes_deployment` instead of an RBAC Role. I replaced it with a `kubernetes_role_v1` example so the implementation matches the topic.
2. The example used unversioned Kubernetes resources. HashiCorp deprecated `kubernetes_role` and `kubernetes_namespace` in provider v3.0.0 in favor of `kubernetes_role_v1` and `kubernetes_namespace_v1`, so I updated the resource types to the current forms.
3. The provider setup was incomplete for OpenTofu because it omitted the `required_providers` block. I added a `terraform` block with the `hashicorp/kubernetes` provider source and a minimum version constraint.
4. The `kube_context` variable defaulted to the literal string `default`, which is not guaranteed to exist in a kubeconfig. I made the variable required so the example does not assume a context name that may be invalid.
5. The variables section contained Deployment-specific inputs such as replicas, image, ports, and resource limits that were unrelated to RBAC Roles. I removed them so the configuration matches the resource actually being managed.
6. The conclusion recommended setting container resource requests and limits, which is advice for workloads, not Roles. I corrected it to describe namespace scope, least privilege, and when to use ClusterRoles.

## Review Notes
- Kubernetes documents that a `Role` is namespaced and that `ClusterRole` is the correct object for cluster-scoped permissions.
- Kubernetes RBAC good practices recommend assigning permissions at the namespace level where possible and keeping privileges minimal.
- HashiCorp's Kubernetes provider v3.1.0 is the latest release as of April 15, 2026; the important compatibility point for this post is that provider v3.0.0 deprecated many unversioned resource names.
