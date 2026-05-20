# Validation Summary: How to Deploy ServiceAccounts and ClusterRoles with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes RBAC: Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings
- Argo CD Applications, automated sync, sync waves, and sync options
- kubectl authorization checks
- AWS IAM Roles for Service Accounts
- GKE Workload Identity Federation
- Azure Workload Identity

## Sources Consulted
- Kubernetes ServiceAccounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Azure Workload Identity service account labels and annotations: https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html

## Issues Found
- The introduction said every ServiceAccount has permissions defined by RBAC rules. This was too broad because a ServiceAccount only receives Kubernetes API permissions when RBAC bindings, or another authorizer, grant them. Updated the wording to say permissions are granted when RBAC rules are bound to the ServiceAccount.
- The GitOps and summary sections said ArgoCD self-healing prevents unauthorized privilege escalation. Argo CD self-heal corrects drift for managed resources after detection and sync; it is not a hard prevention control. Updated the wording to describe drift reversion.
- The Deployment example omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added `selector.matchLabels` and `template.metadata.labels`.
- The CI/CD ServiceAccount example included cluster-scoped `namespaces` and `nodes` permissions in a ClusterRole that was only attached with namespace-scoped RoleBindings. RoleBindings to ClusterRoles grant namespaced permissions only in the RoleBinding namespace, so those cluster-scoped permissions would not be usable. Split cluster-scoped read access into a separate ClusterRole and ClusterRoleBinding.
- The ServiceAccount token section recommended creating a long-lived token as the primary external access path. Kubernetes documentation recommends TokenRequest-based short-lived tokens where possible and treats long-lived ServiceAccount token Secrets as a legacy option. Updated the wording to prefer short-lived tokens and keep the Secret example for cases that need long-lived credentials.
- The Azure Workload Identity example put `azure.workload.identity/use: "true"` on the ServiceAccount. Azure Workload Identity documentation requires this label on the Pod template for mutation; ServiceAccounts use annotations such as `azure.workload.identity/client-id`. Removed the misplaced ServiceAccount label.

## Review Notes
The remaining examples use current Kubernetes RBAC API versions and Argo CD annotations. The post intentionally uses simplified manifests in some sections to show specific concepts, so future improvements could include fully expanded namespace and pod examples for cloud workload identity flows.
