# Validation Summary: How to Use Finalizers in Declarative ArgoCD Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Application resources
- Argo CD Application finalizers
- Argo CD App-of-Apps pattern
- Argo CD sync options and pruning
- Kubernetes finalizers and garbage collection
- kubectl JSON patch commands

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD ApplicationSet Application Deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Kubernetes Finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Referenced OneUptime related post: https://oneuptime.com/blog/post/2026-02-26-argocd-manage-applications-declaratively/view
- Referenced OneUptime related post: https://oneuptime.com/blog/post/2026-02-26-argocd-app-of-apps-pattern-guide/view

## Issues Found
- The post described finalizers as telling the Kubernetes API server to run cleanup logic. Kubernetes finalizers cause the API server to hold deletion while controllers perform cleanup, so the explanation was updated to reflect the API server/controller split.
- The testing workflow created an Argo CD Application without automated sync and then immediately waited for sync. Since `argocd app wait` does not trigger a sync, the example could hang or fail to create resources. Added `argocd app sync test-finalizer` before `argocd app wait test-finalizer`.

## Review Notes
The Argo CD finalizer values, foreground/background behavior, App-of-Apps cleanup behavior, `PrunePropagationPolicy` values, and kubectl JSON patch examples are consistent with current official documentation. The local environment did not have `kubectl` or `argocd` installed, so CLI command validation was performed against official command references rather than local help output.
