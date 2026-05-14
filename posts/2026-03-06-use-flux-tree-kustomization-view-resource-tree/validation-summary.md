# Validation Summary: How to Use flux tree kustomization to View Resource Tree

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- Kustomize Controller Kustomization resources
- Helm Controller HelmRelease resources
- Shell scripting with bash, sed, awk, jq, kubectl

## Sources Consulted
- Flux CLI documentation for `flux tree kustomization`: https://fluxcd.io/flux/cmd/flux_tree_kustomization/
- Flux CLI documentation for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI documentation for `flux events`: https://fluxcd.io/flux/cmd/flux_events/
- Flux CLI documentation for `flux trace`: https://fluxcd.io/flux/cmd/flux_trace/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux source code for `tree kustomization`: https://github.com/fluxcd/flux2/blob/main/cmd/flux/tree_kustomization.go
- Flux object metadata formatting source: https://github.com/fluxcd/pkg/blob/main/ssa/utils/fmt.go

## Issues Found
- The post described `flux tree kustomization --compact` as showing status information. Current Flux documentation and source code define `--compact` as listing Flux resources only, so the section and flag reference were corrected.
- Several sample outputs omitted namespaces for namespaced resources such as Kustomizations and HelmReleases. Flux formats objects as `Kind/namespace/name` for namespaced resources, so the examples were updated.
- The resource conflict comparison sorted raw tree output, which can miss equivalent resources if tree prefix characters differ. The examples now strip tree drawing characters before sorting.
- The resource type counting command used `grep -oP '^\S+'`, which would count tree prefixes instead of resource kinds for child rows. It now strips tree drawing characters and extracts the kind before the first `/`.
- The inventory script used `flux get kustomizations --all-namespaces -o json`, but the current Flux `get kustomizations` command does not document an `-o json` option. The script now uses `kubectl get kustomizations.kustomize.toolkit.fluxcd.io --all-namespaces -o json` and passes each resource namespace to `flux tree kustomization`.

## Review Notes
The local environment did not have the `flux` binary installed, so CLI behavior was verified against current official documentation and upstream source code. The `flux tree kustomization` command is marked as preview in the official Flux documentation, so behavior may change in future Flux releases.
