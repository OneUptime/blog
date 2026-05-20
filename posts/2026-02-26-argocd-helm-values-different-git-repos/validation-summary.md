# Validation Summary: How to Use Helm Value Files from Different Git Repos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSet
- Argo CD multi-source applications
- Helm charts and Helm values files
- Kubernetes custom resources
- GitOps repository patterns
- Argo CD CLI

## Sources Consulted
- Argo CD documentation: Multiple Sources for an Application - https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD documentation: Helm Values Files and Helm Value Precedence - https://argo-cd.readthedocs.io/en/release-3.2/user-guide/helm/
- Argo CD documentation: Webhook Configuration - https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD documentation: `argocd app get` command reference - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD documentation: `argocd app manifests` command reference - https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_manifests/
- Argo CD documentation: ApplicationSet template fields - https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/

## Issues Found
No technical issues found.

## Review Notes
The examples correctly use `spec.sources` for multi-source Applications and `ref` with `$ref/...` value file paths. Official Argo CD documentation confirms that external Helm value files are supported from Argo CD v2.6 through multiple sources, and that `$ref` paths resolve relative to the referenced repository root. The ordering explanation for multiple Helm `valueFiles` is also correct: later value files have higher precedence.

The troubleshooting commands are current. `argocd app get my-app --hard-refresh` refreshes application data and the target manifest cache, and `argocd app manifests my-app` prints generated manifests.
