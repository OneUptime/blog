# Validation Summary: How to Create Sync Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD (Application CRD, sync policies, sync options)
- GitOps reconciliation patterns
- Kubernetes resources (Deployment, Service, ConfigMap, HPA)
- Mermaid diagrams for flow visualization

## Sources Consulted
- ArgoCD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- ArgoCD Auto-Sync: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- ArgoCD Diffing / ignoreDifferences: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- ArgoCD CLI `argocd app sync`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- ArgoCD Application CRD reference (argoproj.io/v1alpha1)

## Issues Found
1. **Selective Sync section had an incorrect technical claim.** The original post stated that `argocd.argoproj.io/sync-options: Prune=false` on a ConfigMap excludes it from auto-sync ("This ConfigMap will not be auto-synced" / "Requires manual sync"). This is wrong — `Prune=false` only prevents the resource from being deleted during pruning; auto-sync still applies changes to the resource.
   - **Fix:** Renamed the section to "Per-Resource Sync Options", changed the intro to accurately describe per-resource sync option overrides, and updated the inline comments to state that `Prune=false` preserves the resource when it is removed from Git (rather than claiming it disables auto-sync).

## Review Notes
- All other YAML manifests, sync option names (`PruneLast`, `ApplyOutOfSyncOnly`, `Replace`, `ServerSideApply`, `CreateNamespace`, `Validate`), the `allowEmpty` field, and the `ignoreDifferences` schema (including `jsonPointers` and `managedFieldsManagers`) are valid against the ArgoCD documentation.
- The retry backoff math in the Mermaid diagram (5s, 10s, 20s, 40s, 80s with `factor: 2`) is correct; 80s is below the 3m cap so "capped to 3m" is slightly imprecise wording but not technically wrong (the cap simply does not engage here).
- `Validate=true` is the default behavior in ArgoCD; the documented form is usually `Validate=false` (to disable). Setting `Validate=true` explicitly is redundant but accepted, so it is left as-is.
- The CLI commands (`argocd app sync`, `--dry-run`, `--force`, `--revision`, `--resource apps:Deployment:myapp`) all match the current CLI reference, including the `GROUP:KIND:NAME` resource selector format.
- The `apiVersion: argoproj.io/v1alpha1` for the Application CRD is current.
