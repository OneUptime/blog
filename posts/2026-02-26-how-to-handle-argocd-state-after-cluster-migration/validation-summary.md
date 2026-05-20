# Validation Summary: How to Handle ArgoCD State After Cluster Migration

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Argo CD CLI
- yq
- jq
- Bash

## Sources Consulted
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Installation documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD Getting Started documentation: https://argo-cd.readthedocs.io/en/release-3.4/getting_started/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd cluster list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_list/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_get/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- yq `eval` command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate

## Issues Found
- The AppProject export comment said it excluded the default project, but the command exported all projects. Updated the comment to match the command.
- The configuration export commands wrote files under `export/` without ensuring that directory existed. Added `mkdir -p export`.
- The inventory listed `argocd-secret`, but the export and import steps did not include it. Added export and import commands for `argocd-secret`.
- The install command used client-side apply for the current stable Argo CD manifests. Updated it to use `kubectl apply --server-side --force-conflicts`, matching current Argo CD guidance for large CRDs.
- The `kubectl wait` examples used lowercase `ready`. Updated them to the official `Ready` pod condition spelling.
- The import loop omitted `argocd-gpg-keys-cm` even though the export loop included it. Added it to the import loop.
- The bundled migration script exported raw Kubernetes resources with runtime metadata and status, unlike the earlier apply-safe snippets. Updated the script to strip runtime metadata and status consistently, and added the missing `argocd-secret`, `argocd-notifications-secret`, and `argocd-gpg-keys-cm` exports.

## Review Notes
The guide is technically valid after the fixes. In production, teams should still prefer pinning Argo CD manifest versions instead of using the moving `stable` branch, and should protect exported Secret manifests because repository, cluster, notification, and Argo CD secrets can contain credentials or signing material.
