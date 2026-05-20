# Validation Summary: How to Configure Default RBAC Policy in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps
- Argo CD RBAC
- Argo CD CLI
- Casbin-style policy rules

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/release-2.6/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD example `argocd-rbac-cm.yaml`: https://raw.githubusercontent.com/argoproj/argo-cd/master/docs/operator-manual/argocd-rbac-cm.yaml
- Argo CD built-in RBAC policy: https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/builtin-policy.csv

## Issues Found
- The post described `policy.default` as only applying when no explicit user or group rule matches. Argo CD documentation says the default policy is evaluated first, and all authenticated users get at least the permissions granted by the default policy. I updated the introduction, default policy explanation, evaluation diagram, and summary to describe it as a baseline role.
- The evaluation diagram incorrectly checked explicit deny and allow rules before the default policy. I changed the diagram to show default role evaluation first, followed by subject and group policy evaluation only when the default role has no matching effect.
- The post implied subject or group `deny` rules can block permissions granted by the default role. Argo CD documentation says default permissions cannot be blocked by a `deny` rule, so I added that caveat.
- The custom default role section suggested adding log access as a reason to use a custom role over `role:readonly`. The current built-in `role:readonly` already includes `logs, get`, so I changed that bullet to focus on granting application and log access without broader visibility into clusters or repositories.
- The example explanation said users with `role:readonly` can only view applications. The built-in readonly role covers more Argo CD resources, so I changed the wording to "ArgoCD resources allowed by `role:readonly`."

## Review Notes
The commands and ConfigMap keys are consistent with the official Argo CD documentation. The post does not pin an Argo CD version, so the review used the current stable documentation and current upstream examples available on 2026-05-20.
