# Validation Summary: How to Migrate Applications Between Projects in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD AppProject
- Argo CD ApplicationSet
- Kubernetes
- jq

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_list/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app delete` command reference and App Deletion guide: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD `argocd proj add-destination` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_add-destination/
- Argo CD `argocd proj get` and `argocd proj windows list` command references: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_get/ and https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_windows_list/
- Argo CD upstream CLI source for JSON output behavior: https://github.com/argoproj/argo-cd

## Issues Found
- The source repository check only handled single-source Applications. Updated the `jq` filter to include both `spec.source.repoURL` and `spec.sources[].repoURL`.
- The resource type check used `argocd app resources -o json` and an invalid `jq` expression. Current Argo CD `app resources` output is tree-oriented, so the post now reads resource group/kind data from `argocd app get -o json` under `status.resources`.
- The resource allow-list explanation ignored namespaced resource deny-list behavior. Clarified that cluster-scoped resources must be allowed, while namespaced resources are governed by namespace whitelist or blacklist settings.
- The delete-and-recreate export saved a full Application object and reapplied it without removing status or server-generated metadata. Updated the command to produce a clean JSON manifest before reapplying it.
- The batch migration script did not quote project and application variables. Quoted the shell variables used in CLI calls.
- The post-migration verification commands treated `argocd app list -o json` as an object with `.items[]`, but the CLI marshals a JSON array. Updated those filters to use `.[]`.
- The source project lock-down example used `argocd proj set --src ""`, which can leave an empty-string source rule rather than clearly clearing the project. Replaced it with a Kubernetes patch that sets `sourceRepos` and `destinations` to empty arrays.

## Review Notes
The post is technically accurate after the fixes. The examples assume the Application already exists and has populated `status.resources`; for applications that have never synced, users may need to render manifests or inspect intended manifests separately.
