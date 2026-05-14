# Validation Summary: How to Use flux get all to Check Cluster Status

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CLI
- Flux CD
- Kubernetes
- GitOps
- Bash shell scripting

## Sources Consulted
- Flux CLI reference for `flux get all`: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux CLI reference for `flux get`: https://fluxcd.io/flux/cmd/flux_get/
- Flux CLI reference for `flux get sources all`: https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux CLI reference for `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI reference for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI reference for `flux resume kustomization`: https://fluxcd.io/flux/cmd/flux_resume_kustomization/
- Flux CLI reference for `flux resume helmrelease`: https://fluxcd.io/flux/cmd/flux_resume_helmrelease/
- Flux CLI reference for `flux resume source git`: https://fluxcd.io/flux/cmd/flux_resume_source_git/
- Flux CLI reference for `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI reference for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux installation documentation: https://fluxcd.io/flux/installation/

## Issues Found
- The post said the basic `flux get all` command shows resources across all namespaces. The official CLI reference shows the namespace defaults to `flux-system`, so this was corrected.
- The `--status-selector ready=false` example was described as showing additional status details. It filters resources by condition status, so the description was corrected.
- Several examples used `grep "False"` to find unhealthy resources. This also matches the `SUSPENDED` column for healthy, non-suspended resources, so the examples were changed to use `--status-selector ready=false` or an `awk` check against the READY column.
- Several examples used `grep "True"` or `--status-selector suspended=true` to find suspended resources. `grep "True"` can match the READY column, and `--status-selector` filters status conditions rather than the SUSPENDED table column, so these examples were changed to check the SUSPENDED column with `awk`.
- The health check script counted every `False` value, which would count healthy resources with `SUSPENDED=False` as unhealthy. It now counts rows returned by `flux get all -A --status-selector ready=false --no-header`.
- The post showed `flux get all -o json` and `flux get all -o yaml`, but the current official `flux get all` reference does not document an output flag for this command. Those examples and quick-reference rows were removed.
- The post showed `flux reconcile source git --all`, but the current official `flux reconcile source git` reference requires a GitRepository name and does not document `--all`. It was replaced with a named GitRepository example.

## Review Notes
The current Flux documentation marks `flux get all` and `flux get sources all` as preview commands, so their output may change in future Flux releases.
