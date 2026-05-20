# Validation Summary: How to Disable SSO and Use Only Local Accounts in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD local accounts and SSO configuration
- Argo CD CLI
- Argo CD RBAC
- Kubernetes ConfigMaps, Secrets, Deployments, Ingress, and NetworkPolicy
- Argo CD Helm chart
- ingress-nginx rate limiting

## Sources Consulted
- Argo CD user management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd account update-password` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_update-password/
- Argo CD getting started documentation for the initial admin password: https://argo-cd.readthedocs.io/en/release-2.0/getting_started/
- Argo CD Helm chart values reference: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Linked OneUptime SSO article: https://oneuptime.com/blog/post/2026-01-27-argocd-sso/view

## Issues Found
- The local-user password setup commands omitted `--current-password`. Argo CD's CLI supports prompting for the current user's password, but the non-interactive examples are clearer and match the official documentation when they include `--current-password <current-admin-password>`. Updated the account setup examples and the password rotation reminder.
- The post described the built-in `admin` account as the primary admin account. Argo CD documentation recommends using it only for initial configuration and disabling it after additional users are created. Updated the guidance to keep `admin` enabled only during bootstrap, then disable it after another admin account is verified.
- The post said Argo CD has no built-in brute-force protection. Current Argo CD documentation states that failed-login throttling is built in and configurable with environment variables. Updated the text to describe ingress rate limiting as an additional control.

## Review Notes
- The RBAC examples use the standard Argo CD Casbin policy format and valid resources/actions. In environments with "applications in any namespace" enabled, object patterns may need the documented `<project>/<namespace>/<application>` format instead of `<project>/<application>`.
- The `policy.default: role:readonly` example is valid, but Argo CD documentation warns that all authenticated users receive the default role and those permissions cannot be blocked by deny rules. A stricter custom default role may be preferable for production.
