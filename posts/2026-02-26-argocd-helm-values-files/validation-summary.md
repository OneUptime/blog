# Validation Summary: How to Use Helm Values Files in ArgoCD Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Helm charts and values files
- Kubernetes manifests
- GitOps repository structure
- Argo CD CLI

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/applicationset/applicationset-specification/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/

## Issues Found
- The verification section said `argocd app get my-app -o json | jq '.spec.source.helm'` shows the effective values being passed to Helm. That command shows the configured Helm source fields, such as `valueFiles` and inline values, not the fully merged effective values. Updated the comment to say it shows the configured Helm values files and inline values.

## Review Notes
- The `valueFiles` examples are consistent with Argo CD documentation: paths are relative to the chart root for same-repository values files, later files have higher precedence, and missing values files fail unless `ignoreMissingValueFiles` is enabled.
- The multi-source `$values/...` example matches Argo CD's documented pattern for using Git-hosted values files with a Helm chart repository source. The `$values` reference must appear at the beginning of the value file path and resolves relative to the root of the referenced source.
- The CLI examples use current `--values` flags supported by `argocd app create` and `argocd app set`.
