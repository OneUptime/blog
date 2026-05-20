# Validation Summary: How to Use the 'Validate' Sync Option to Skip Validation in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- CustomResourceDefinitions
- GitOps sync options
- Server-Side Apply

## Sources Consulted
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The opening explanation implied Argo CD validates manifests directly against the API server schema before applying. Updated it to match Argo CD documentation, which describes `Validate=false` as disabling kubectl validation equivalent to `kubectl apply --validate=false`.
- The CRD guidance incorrectly suggested that applying a CRD and custom resource in the same sync generally requires `Validate=false`. Argo CD documentation states that when the CRD is part of the same sync, Argo CD automatically skips the dry run for the new custom resource type. Updated the section to distinguish dry-run behavior from kubectl validation.
- The CLI example used `argocd app sync --sync-option Validate=false`, but current Argo CD command docs do not list `--sync-option` for `argocd app sync`. Replaced it with `argocd app set --sync-option Validate=false`, followed by sync and removal with the documented `!` prefix.
- The CI validation text said `--dry-run=client` while the command used `--dry-run=server`. Updated the text to match the command and Kubernetes documentation.
- The risks section described Kubernetes silently ignoring misspelled fields too broadly. Updated it to reflect current kubectl behavior where disabled validation can silently drop unknown or duplicate fields, while the API server may also prune unknown fields depending on schema.

## Review Notes
The post is technically valid after the corrections. Future improvements could mention `SkipDryRunOnMissingResource=true` explicitly for cases where a custom resource's CRD is not part of the same Argo CD sync.
