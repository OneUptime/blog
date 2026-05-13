# Validation Summary: How to Test Flux Kustomization with flux debug kustomization

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CLI
- Flux Kustomization custom resources
- Kubernetes
- Kustomize
- GitOps

## Sources Consulted
- Flux CLI documentation for `flux debug kustomization`: https://fluxcd.io/flux/cmd/flux_debug_kustomization/
- Flux CLI source for `flux debug kustomization`: https://raw.githubusercontent.com/fluxcd/flux2/main/cmd/flux/debug_kustomization.go
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI documentation for `flux build kustomization`: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux CLI source for `flux build kustomization`: https://raw.githubusercontent.com/fluxcd/flux2/main/cmd/flux/build_kustomization.go
- Flux CLI documentation for `flux export kustomization`: https://fluxcd.io/flux/cmd/flux_export_kustomization/
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI documentation for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux events documentation: https://fluxcd.io/flux/cmd/flux_events/

## Issues Found
- The `flux debug kustomization` examples omitted the required debug mode flag. Current Flux requires exactly one of `--show-status`, `--show-vars`, or `--show-history`, so examples that describe status output were changed to include `--show-status`.
- The description of `flux debug kustomization` implied that it prints source information by default. With `--show-status`, the command prints the Kustomization status block, so the wording was narrowed to the fields available in status.
- The inventory description said entries list namespace, name, group, version, and kind separately. Flux status inventory entries are object references with an `id` and API version, so the wording was corrected.
- The path section said `.spec.path` must point to a directory containing `kustomization.yaml`. Flux also supports directories of plain Kubernetes manifests and can generate a `kustomization.yaml`, so the wording was corrected.
- The full YAML example used `flux get kustomization ... -o yaml`. The Flux status command does not provide that YAML output path, so it was changed to `kubectl get kustomization ... -o yaml`.
- The local `flux build kustomization --dry-run` example omitted `--kustomization-file`. Current Flux requires a kustomization file in dry-run mode, so the exported YAML file is now passed with `--kustomization-file ./kustomization-apps.yaml`.

## Review Notes
The `flux debug kustomization` command is documented by Flux as preview and under development, so future Flux releases may change its behavior or flags.
