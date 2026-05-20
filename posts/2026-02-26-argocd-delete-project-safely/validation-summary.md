# Validation Summary: How to Delete a Project Without Breaking Applications in ArgoCD

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD AppProject and Application custom resources
- Argo CD ApplicationSet
- Kubernetes
- kubectl
- jq

## Sources Consulted
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd proj delete` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_delete/
- Argo CD `argocd proj create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_create/
- Argo CD `argocd proj get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_get/
- Argo CD `argocd proj set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_set/
- Argo CD `argocd proj remove-source` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_remove-source/
- Argo CD `argocd proj remove-destination` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_remove-destination/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app delete` command reference and app deletion guide: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete/ and https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD `argocd appset list` command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_appset_list/
- Argo CD CLI source for project construction and list output behavior: https://github.com/argoproj/argo-cd

## Issues Found
- The introduction implied that deleting an AppProject could trigger cascading workload deletion. Project deletion can leave applications referencing a missing project when not protected, but cascading workload deletion is tied to Application deletion and its finalizer. Updated the wording.
- The post stated that Argo CD projects have the project finalizer unconditionally. Official examples show the finalizer as a metadata field to include for protection, and the CLI project construction does not add it directly. Updated wording to say projects can use the finalizer and that the safety net applies when it is present.
- The `argocd app list -o json` jq example used `.items[]`, which is the Kubernetes List shape. Argo CD CLI list JSON is an array, so the example now uses `.[]`.
- The cascading application deletion example used `argocd app wait --deleted`; the official flag is `--delete`. Updated the command.
- The lock-and-abandon section said it removed all source repositories and destinations, but the commands only attempted to set an empty source list and remove one destination. Replaced them with `kubectl patch` commands that set the AppProject `sourceRepos` and `destinations` lists to empty arrays.

## Review Notes
The ApplicationSet checks cover the common top-level `.spec.template.spec.project` case. ApplicationSets with generator-level template overrides or templated project values may need additional review in a real cluster.
