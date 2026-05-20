# Validation Summary: How to Migrate from FluxCD v2 to ArgoCD

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Argo CD
- FluxCD v2
- Kubernetes
- Kustomize
- Helm
- GitOps
- Argo CD Notifications
- Argo CD Image Updater

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD repository CLI reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD resource health checks: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Notifications services, triggers, and templates: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/overview/, https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/, https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Flux Kustomization documentation and API reference: https://fluxcd.io/flux/components/kustomize/kustomizations/, https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease documentation and API reference: https://fluxcd.io/flux/components/helm/helmreleases/, https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI command references for export, suspend, delete, and uninstall: https://fluxcd.io/flux/cmd/flux_export_kustomization/, https://fluxcd.io/flux/cmd/flux_export_helmrelease/, https://fluxcd.io/flux/cmd/flux_suspend_kustomization/, https://fluxcd.io/flux/cmd/flux_delete_kustomization/, https://fluxcd.io/flux/cmd/flux_delete_helmrelease/, https://fluxcd.io/flux/installation/uninstall/

## Issues Found
- Updated the Argo CD installation command to use `kubectl apply --server-side --force-conflicts`, matching the current stable Argo CD getting started documentation for large CRDs such as ApplicationSet.
- Added `releaseName` and `targetNamespace` to the Flux HelmRelease example, and `helm.releaseName` to the Argo CD Application example, so the migration preserves the Helm release identity and target namespace.
- Corrected the cutover process to suspend either Flux Kustomizations or HelmReleases, not only Kustomizations.
- Corrected the deletion guidance for Flux Kustomizations with `prune: true` by adding `deletionPolicy: Orphan` before deletion. Without this, deleting the Flux Kustomization can garbage-collect live workloads.
- Added a warning not to run `flux delete helmrelease` during cutover unless the intent is to uninstall the Helm release, because Flux deletion of a HelmRelease removes the Helm release and its resources.
- Softened the Argo CD verification wording from "without actually changing any running resources" to confirming the expected diff, because an Argo CD Application with automated sync can apply changes.

## Review Notes
- The notification example is technically valid as a minimal ConfigMap pattern, but production setups also need subscriptions through Application annotations or default triggers and should keep Slack tokens in `argocd-notifications-secret`.
- The migration examples use the current `argoproj.io/v1alpha1` Application API and Flux `kustomize.toolkit.fluxcd.io/v1` / `helm.toolkit.fluxcd.io/v2` APIs.
