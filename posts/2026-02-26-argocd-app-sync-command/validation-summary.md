# Validation Summary: How to Use argocd app sync with Options

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Argo CD CLI
- Helm parameter overrides
- CI/CD deployment workflows

## Sources Consulted
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_wait/
- Argo CD sync applications with kubectl documentation: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/sync-kubectl/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/

## Issues Found
- The namespaced `--resource` example used `GROUP:KIND:NAME:NAMESPACE`, but the official CLI examples use `GROUP:KIND:NAMESPACE/NAME` when a namespace must be specified. Updated the example and format description.
- The `--force` explanation stated that Argo CD always deletes and recreates resources instead of applying. Official Argo CD documentation describes `--force` as force apply behavior, with deletion occurring when patching cannot be completed after retries. Updated the explanation and warning.
- The `--strategy hook` explanation said hooks run but manifests are not applied. Official documentation describes hook strategy as the default sync strategy that submits referenced resources while taking hook annotations into account. Updated the wording.
- The Helm section used `argocd app sync --helm-set`, but `--helm-set` is an `argocd app set` flag, not an `argocd app sync` flag. Updated the example to set Helm parameters first, then sync, and corrected the persistence note.

## Review Notes
The remaining CLI flags and examples reviewed are consistent with the official Argo CD command references. The post does not pin an Argo CD version, so the review used current official documentation where available.
