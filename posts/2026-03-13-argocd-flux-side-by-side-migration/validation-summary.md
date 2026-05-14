# Validation Summary: How to Run ArgoCD and Flux Side by Side During Migration

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Flux CD
- Argo CD
- Kubernetes
- GitOps
- Bash scripting

## Sources Consulted
- Flux bootstrap GitHub command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitHub bootstrap installation guide: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux suspend/resume Kustomization command documentation: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/resource_tracking/
- Argo CD application deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/

## Issues Found
- The bootstrap example used `--personal` with an organization-style owner. Flux documents `--personal` as appropriate when the owner is a GitHub user, so the command was updated to omit it and explain when to add it.
- The sample Flux Kustomization referenced a `GitRepository` named `fleet-repo`. Flux bootstrap commonly creates the bootstrap source as `flux-system`, so the example was corrected to reference `flux-system`.
- The example created `/tmp/myapp-flux.yaml` but committed `clusters/production/apps/myapp.yaml`. The file creation path was corrected to match the Git add command.
- The Flux resume step used a CLI patch while Git still declared `suspend: true`. The migration step was corrected to remove `suspend: true` in Git, commit, push, and reconcile the bootstrap Kustomization.
- The ownership conflict script used `kubectl get all`, which misses many resource kinds, and used the non-default Argo CD label `argocd.argoproj.io/app-name`. The script now scans namespaced and cluster-scoped listable resources and uses Argo CD's documented default `app.kubernetes.io/instance` tracking label, with a note for custom tracking configurations.
- The rollback section implied rollback works after deleting the Argo CD Application. It now clarifies that the shown commands apply before deletion and that a deleted Application must be restored first.
- The introduction claimed migration could happen without any outage risk. This was softened to "reducing the risk" because parallel operation lowers risk but cannot eliminate it.

## Review Notes
- The conflict detection script is more complete than `kubectl get all`, but clusters using Argo CD annotation-based tracking need a different detection method because labels may be informational rather than authoritative.
- The `targetNamespace` field does not create a namespace automatically; the post now notes that the target namespace must already exist or be included in the reconciled manifests.
