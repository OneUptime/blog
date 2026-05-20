# Validation Summary: How to Use Skip Hooks in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD sync hooks and sync waves
- Argo CD resource exclusions
- Argo CD diff customization
- Kustomize
- Argo CD CLI

## Sources Consulted
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-2.3/user-guide/resource_hooks/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD annotations reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/annotations-and-labels/
- Argo CD resource exclusion/inclusion documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/declarative-setup/#resource-exclusioninclusion
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD gitops-engine hook implementation: https://github.com/argoproj/argo-cd/blob/master/gitops-engine/pkg/sync/hook/hook.go
- Argo CD application state handling for skipped resources: https://github.com/argoproj/argo-cd/blob/master/controller/state.go
- Argo CD application health handling for skipped resources: https://github.com/argoproj/argo-cd/blob/master/controller/health.go

## Issues Found
- The post overstated Skip behavior by saying skipped resources are completely invisible to Argo CD, not tracked, and not diffed. Official documentation defines `Skip` as skipping application of the manifest, and the current Argo CD implementation still detects skipped target resources while excluding them from overall sync and health decisions. I updated the explanation to say skipped resources are not applied and do not affect application sync or health, while noting they may still appear in resource views.
- The verification section claimed skipped resources will not appear in `argocd app resources` or `argocd app diff`. This is not a reliable validation method for current Argo CD behavior. I changed the example to sync the app and verify with `kubectl` that the skipped object was not created.
- The Kustomize example used `patchesStrategicMerge`, which is deprecated in current Kustomize versions. I changed it to the current `patches` form with `path: skip-debug.yaml`.

## Review Notes
The post is now technically accurate for the documented Argo CD Skip hook behavior. Future improvements could mention that `Skip` is a hook value, not the same feature as `argocd.argoproj.io/skip-reconcile`, which pauses reconciliation for Applications or cluster secrets.
