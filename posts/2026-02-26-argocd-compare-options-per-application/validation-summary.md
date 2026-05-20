# Validation Summary: How to Configure Compare Options per Application in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD diff customization
- Kubernetes manifests
- JSON Pointer
- JQ path expressions
- Argo CD CLI

## Sources Consulted
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Compare Options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/compare-options/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD changelog for v2.3 managedFieldsManagers introduction: https://github.com/argoproj/argo-cd/blob/master/CHANGELOG.md
- RFC 6901 JSON Pointer: https://www.rfc-editor.org/rfc/rfc6901

## Issues Found
- The post described `spec.ignoreDifferences` as "compare options" and referenced a non-existent `compareOptions` spec. Argo CD documents `spec.ignoreDifferences` as diff customization, while Compare Options are a separate resource annotation feature. Updated the title, description, headings, and related wording to use "diff customization" and `ignoreDifferences`.
- The managed field manager section said `managedFieldsManagers` was supported in ArgoCD 2.5 and later. Argo CD introduced this diff customization in v2.3, so the version claim was corrected to ArgoCD 2.3 and later.
- A JQ example claimed to ignore annotations matching a pattern by returning matching keys. Replaced it with Argo CD's documented list-item style pattern using `initContainers[] | select(...)`, which is a valid use of JQ path expressions for diff customization.
- The best-practice guidance broadly recommended starting with JQ expressions for most cases. Adjusted it to recommend JQ expressions for list items or complex paths, which better matches the documented use cases.

## Review Notes
- The Argo CD CLI commands `argocd app get`, `argocd app diff`, and `argocd app get --hard-refresh` are valid according to the official command reference. The local environment did not have the `argocd` binary installed, so CLI validation was performed against official documentation rather than local `--help` output.
- The internal OneUptime link target exists in the repository.
