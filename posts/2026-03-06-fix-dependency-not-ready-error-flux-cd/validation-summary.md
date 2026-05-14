# Validation Summary: How to Fix 'dependency not ready' Error in Flux CD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Flux HelmRelease API
- Flux CLI
- Kubernetes kubectl
- Kubernetes YAML manifests
- Python

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- Clarified that Flux `dependsOn` dependency ordering is between Kustomization resources and between HelmRelease resources, not a generic cross-kind dependency relationship.
- Added the required `spec.prune` field to Kustomization examples that were missing it, because Flux marks `.spec.prune` as a required boolean field.
- Updated the circular dependency examples to include the required Kustomization fields so the examples remain valid Flux Kustomization manifests while demonstrating an invalid dependency graph.
- Changed `kubectl get ... -o custom-columns` examples to select the `Ready` condition by type instead of assuming `.status.conditions[0]` is always the Ready condition.
- Quoted the `custom-columns` arguments so the JSONPath filter syntax is passed to `kubectl` correctly by the shell.
- Replaced `flux get helmrelease cert-manager -n flux-system` with the documented `flux get helmreleases` command form.
- Removed the undocumented `flux reconcile kustomization --all` example and replaced it with a documented `flux reconcile source git` command followed by named Kustomization reconciliations.

## Review Notes
The post is technically relevant and current for Flux Kustomization `apiVersion: kustomize.toolkit.fluxcd.io/v1` and HelmRelease `apiVersion: helm.toolkit.fluxcd.io/v2`. The local environment did not have `flux` or `kubectl` installed, so CLI verification was performed against the official command reference rather than local `--help` output.
