# Validation Summary: How to Manage ArgoCD Projects Declaratively

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD AppProjects
- Kubernetes custom resources and kubectl
- GitOps
- Argo CD RBAC project roles
- Argo CD sync windows
- Argo CD orphaned resource monitoring

## Sources Consulted
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Projects user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Argo CD Orphaned Resources Monitoring: https://argo-cd.readthedocs.io/en/stable/user-guide/orphaned-resources/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD argocd proj command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Linked OneUptime post: https://oneuptime.com/blog/post/2026-02-26-argocd-manage-applications-declaratively/view
- Author GitHub profile: https://github.com/nawazdhandala

## Issues Found
- The first AppProject example described `resources-finalizer.argocd.argoproj.io` as preventing accidental deletion. Argo CD documents this project finalizer as preventing deletion until the project is no longer referenced by applications, so the comment was updated to say that directly.
- The business-hours sync window used `schedule: '0 9-17 * * 1-5'` with `duration: 8h`, which would create overlapping 8-hour allow windows every hour from 09:00 through 17:00. It was changed to `schedule: '0 9 * * 1-5'` with `duration: 8h`, matching the stated 09:00 to 17:00 weekday window.

## Review Notes
- The AppProject API fields used in the examples are current in the stable Argo CD documentation.
- The `argocd proj list`, `argocd proj get`, and `kubectl apply --dry-run=server` commands are documented and current.
- The local review environment did not have `argocd` or `kubectl` installed, so command verification was performed against official command references rather than local CLI help output.
