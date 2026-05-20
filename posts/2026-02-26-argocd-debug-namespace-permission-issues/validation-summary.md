# Validation Summary: How to Debug Namespace Permission Issues for Applications in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD Applications in any namespace
- Argo CD AppProject configuration
- Argo CD RBAC
- Kubernetes RBAC
- kubectl
- Argo CD CLI

## Sources Consulted
- Argo CD Applications in Any Namespace documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/
- Argo CD RBAC Configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The Argo CD RBAC examples for applications in any namespace used the older `<project>/<application>` object format (`team-a/my-app` and `team-a/*`). Argo CD documentation states that when applications in any namespace is enabled, application-specific RBAC objects use `<project>/<app-namespace>/<app-name>`. Updated the diagnosis, policy, and verification examples to use `team-a/team-a/my-app` and `team-a/team-a/*`.
- The permission stack diagram described the Argo CD RBAC layer as checking only user and project. Updated it to include the application namespace, matching the corrected RBAC object format.

## Review Notes
The remaining commands and configuration snippets match the documented Argo CD and Kubernetes behavior. The controller/server RBAC example is intentionally broad for troubleshooting; in production, operators should prefer the least privilege permissions needed for their installation.
