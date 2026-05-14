# Validation Summary: How to Use flux debug helmrelease for Helm Debugging

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD
- Flux CLI
- HelmRelease
- Helm
- Kubernetes
- Bash
- YAML

## Sources Consulted
- Flux CLI documentation for `flux debug helmrelease`: https://fluxcd.io/flux/cmd/flux_debug_helmrelease/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux source code for `debug_helmrelease.go`: https://github.com/fluxcd/flux2/blob/main/cmd/flux/debug_helmrelease.go
- Flux v2.5.0 source code for `debug_helmrelease.go`: https://github.com/fluxcd/flux2/blob/v2.5.0/cmd/flux/debug_helmrelease.go
- Helm `template` command documentation: https://helm.sh/docs/v3/helm/helm_template/
- Helm `upgrade` command documentation: https://helm.sh/docs/v3/helm/helm_upgrade/

## Issues Found
- The prerequisite listed Flux CLI v2.2.0 or later, but `flux debug helmrelease` was introduced after v2.3.0 and first appears in the Flux v2.5.0 tag. Updated the prerequisite to Flux CLI v2.5.0 or later.
- Multiple examples used `flux debug helmrelease` without an output flag. Current Flux requires exactly one of `--show-status`, `--show-values`, or `--show-history`, and Flux v2.5.0 requires either `--show-status` or `--show-values`. Updated examples to use `--show-values` when exporting computed values and `--show-status` when inspecting status.
- The post described `--show-values` as the default behavior. Updated this to state that the command requires an explicit output flag.
- The value merge order was incorrect. Flux merges `valuesFrom` entries in list order, with later entries overwriting earlier entries, and then inline `spec.values` overwriting those merged values. Updated the merge-order explanation and best practice.
- The sample HelmRelease omitted `sourceRef.namespace` while later examples reconciled the HelmRepository in `flux-system`. Added `namespace: flux-system` to the source reference and updated associated `flux get sources chart` commands to check the generated HelmChart in `flux-system`.

## Review Notes
The `flux debug helmrelease` command is marked preview in the official Flux documentation, so flags and output may change in future Flux releases. The command may print sensitive values when a HelmRelease references Secrets through `.spec.valuesFrom`.
