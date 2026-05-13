# Validation Summary: How to Fix Flux Reconciliation After etcd Restore

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Kubernetes
- etcd backup and restore
- GitOps reconciliation
- kubectl
- Kustomization and GitRepository custom resources

## Sources Consulted
- Flux CLI documentation for `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI documentation for `flux create secret git`: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux Kustomization documentation, including inventory and `spec.force`: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux bootstrap cheatsheet for source-controller artifact storage: https://v2-0.docs.fluxcd.io/flux/cheatsheets/bootstrap/
- Flux CLI documentation for `flux suspend kustomization`: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Kubernetes documentation for `kubectl patch` and subresources: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/

## Issues Found
- The post used `flux reconcile source git --all`, but the official Flux CLI documentation does not list an `--all` flag for this command. Replaced it with a loop over `GitRepository` resources and reconciled each named source.
- The post used `flux reconcile kustomization --force`, but the official Flux CLI documentation for `flux reconcile kustomization` only supports `--with-source`. Replaced this with a normal reconciliation loop and clarified that force behavior is controlled through `spec.force`.
- The post described force reconciliation as overwriting resource version conflicts. Flux `spec.force` is documented as replacing resources when patching fails due to immutable field changes, so the wording was corrected.
- The inventory verification command parsed Flux inventory IDs as if they contained the full GVK in one field. Flux stores inventory IDs as namespace, name, group, and kind, with the API version in the separate `v` field. Updated the command to parse the ID and version correctly.
- The inventory reset command patched `.status.inventory` without using the Kubernetes status subresource. Updated the command to use `--subresource=status`.
- The post stated that source-controller stores artifacts on a PVC. Official Flux documentation says the default is `emptyDir`, with persistent volume storage as an optional configuration. Updated the text accordingly.
- The event command used `head` after sorting events by timestamp, which shows the oldest events rather than the latest. Changed it to `tail`.

## Review Notes
The guide assumes Flux resources live in the `flux-system` namespace. That is a common bootstrap layout, but multi-tenant or customized Flux installations may need `-A` or namespace-specific loops.
