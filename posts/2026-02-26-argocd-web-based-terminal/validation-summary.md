# Validation Summary: How to Enable Web-Based Terminal in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD web-based terminal
- Argo CD RBAC
- Kubernetes RBAC
- kubectl
- Argo CD Helm chart
- NGINX Ingress annotations

## Sources Consulted
- Argo CD Web-based Terminal documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/web_based_terminal/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD RBAC validation and testing documentation: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/rbac/#validating-and-testing-your-rbac-policies
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/release-2.5/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd admin settings rbac validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Argo CD `argocd-cm.yaml` example: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/argocd-cm-yaml/
- Argo CD security and audit logging documentation: https://argo-cd.readthedocs.io/en/release-2.7/operator-manual/security/
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Referenced OneUptime article URL: https://oneuptime.com/blog/post/2026-02-26-argocd-restrict-terminal-access-rbac/view

## Issues Found
- The RBAC policy scope was documented as `<project>/<namespace>/<app>`, but Argo CD's default application-specific RBAC object is `<project>/<application>`. Updated the pattern and added the applications-in-any-namespace caveat.
- The Kubernetes RBAC section implied `pods/exec` `create` permission is generally required. Updated it to match Argo CD's current documentation: additional `pods/exec` RBAC is needed for Kubernetes versions before 1.31.
- The shell section said Argo CD uses `/bin/bash` by default. Updated it to say Argo CD tries `bash`, `sh`, `powershell`, and `cmd` in order, and that `exec.shells` configures the allowed shell list.
- The audit logging snippet used `server.audit.enabled`, which is not present in the official Argo CD config reference. Replaced it with guidance to review Argo CD API server logs and Kubernetes audit logs.
- The RBAC troubleshooting command used unsupported `argocd admin settings rbac validate --action --resource` flags. Replaced it with the documented `argocd admin settings rbac can` command syntax.
- The Helm values example used `server.config` and `server.rbacConfig`, but the current Argo CD Helm chart exposes these settings under `configs.cm` and `configs.rbac`. Updated the example accordingly.

## Review Notes
The post is technically relevant and salvageable. The remaining examples are representative and align with the official Argo CD, Kubernetes, and ingress-nginx documentation consulted. The local `argocd` CLI was not installed in this workspace, so CLI command verification was performed against the official command reference.
