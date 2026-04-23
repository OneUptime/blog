# Validation Summary: How to Implement RBAC Best Practices in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager RBAC
- Kubernetes RBAC
- Kubernetes Service Accounts
- `kubectl`
- OIDC / SSO / external authentication in Rancher

## Sources Consulted
- Rancher: Managing Role-Based Access Control (RBAC) https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac
- Rancher: Global Resources https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-resources
- Rancher: Cluster and Project Roles https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher: Custom Roles https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/custom-roles
- Rancher: Projects workflow https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher API Reference https://ranchermanager.docs.rancher.com/api/api-reference
- Rancher: Configuring Authentication https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config
- Rancher: Adding Users to Projects https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/add-users-to-projects
- Kubernetes: Service Accounts https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes: Configure Service Accounts for Pods https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes: `kubectl auth can-i` https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The introduction and hierarchy diagram implied that Rancher global roles sit above cluster and project roles. I corrected this to match Rancher's documented model of global permissions plus cluster and project roles.
- The `RoleTemplate` examples used a namespaced, `spec`-based shape. I changed them to Rancher's documented `RoleTemplate` schema, where fields such as `context`, `displayName`, and `rules` are top-level.
- The `ProjectRoleTemplateBinding` example incorrectly nested fields under `spec`, used an imprecise namespace placeholder, and pointed to an outdated UI path. I updated it to Rancher's documented binding shape and backing-namespace pattern.
- The service account token guidance said patching the `default` service account disabled automount cluster-wide. I corrected that to namespace-scoped wording.
- The namespace access review command was described as listing all users with access to a namespace. I corrected the wording so it accurately describes listing namespaced `RoleBinding`s.
- The SSO section used an outdated authentication navigation path and described assigning the custom `Developer` role as if it were a cluster role. I corrected the UI path and scope wording.
- The conclusion referenced only `get rolebindings` for audits. I updated it to include `get clusterrolebindings`, which is needed for a fuller Kubernetes RBAC review.

## Review Notes
- Rancher documents that `project-member` inherits from the Kubernetes `edit` role and `project-owner` inherits from the Kubernetes `admin` role. The post's recommendation to avoid broad project ownership for developers remains directionally sound.
- For Rancher-heavy environments, access reviews may also inspect `ClusterRoleTemplateBinding` and `ProjectRoleTemplateBinding` objects on the management cluster in addition to downstream Kubernetes `RoleBinding` and `ClusterRoleBinding` objects.
