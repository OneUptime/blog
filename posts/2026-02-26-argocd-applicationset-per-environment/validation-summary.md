# Validation Summary: How to Create Per-Environment Applications with ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- GitOps
- Helm
- Kustomize
- Argo CD CLI

## Sources Consulted
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Git Generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Template and templatePatch documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD appset get command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_appset_get/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_list/
- OneUptime referenced blog URL: https://oneuptime.com/blog/post/2026-02-26-argocd-applicationset-label-selectors/view

## Issues Found
- The environment-specific sync policy example used Go template control blocks directly inside `spec.template.spec.syncPolicy`, including templated boolean and numeric fields. Argo CD Go templates are applied per field and only to string fields, so this pattern would not work. Updated the example to use the documented `templatePatch` mechanism for conditional `automated`, `prune`, and `retry.limit` values.
- The progressive rollout example included `syncPolicy.automated`, but Argo CD RollingSync forces autosync off for generated Applications. Removed the automated sync policy from that example and added a note that RollingSync disables autosync and requires progressive syncs to be enabled on the ApplicationSet controller.

## Review Notes
- The remaining ApplicationSet examples use supported `argoproj.io/v1alpha1` ApplicationSet fields and generator patterns.
- The Argo CD CLI commands shown are valid according to the official command references. The local workspace did not have the `argocd` CLI available, so command validation was performed against official documentation.
- Progressive Syncs are documented as a beta feature since Argo CD v3.3.0 and must be explicitly enabled before use.
