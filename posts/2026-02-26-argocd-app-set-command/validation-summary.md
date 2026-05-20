# Validation Summary: How to Use argocd app set to Update Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- GitOps
- Kubernetes
- Helm
- Kustomize
- Bash

## Sources Consulted
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD `argocd app unset` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_unset/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/

## Issues Found
- The temporary debugging workflow said `argocd app sync my-app` would restore values from Git after using `argocd app set`. This was incorrect because `app set` changes the Application spec, and `app sync` syncs from that modified desired state. Updated the example to unset the temporary parameter overrides before syncing.
- The note under temporary debugging said auto-sync would overwrite temporary `argocd app set` changes unless they match Git. This was too broad and misleading. Updated it to explain that `argocd app set` changes remain until unset, changed again, or overwritten by a declarative Application definition.
- The unset example used `argocd app unset my-app --helm-set image.tag`, but `argocd app unset` does not provide a `--helm-set` flag. Updated it to use `argocd app unset my-app -p image.tag`, matching the official command reference for unsetting parameter overrides.

## Review Notes
The remaining CLI flags and examples match the current Argo CD command reference. The post correctly distinguishes Application spec changes from manifest changes, with the caveat that declaratively managed Applications should be updated in Git to avoid drift from the GitOps source of truth.
