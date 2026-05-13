# Validation Summary: How to Test Flux Kustomization Overlays with flux build

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux Kustomization custom resources
- Kubernetes
- Kustomize overlays and patches
- Bash scripting
- pre-commit hooks
- yq YAML processing

## Sources Consulted
- Flux CLI documentation for `flux build kustomization`: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI source for `build kustomization` dry-run validation: https://github.com/fluxcd/flux2/blob/main/cmd/flux/build_kustomization.go
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- yq documentation: https://mikefarah.gitbook.io/yq/

## Issues Found
- The dry-run examples used `flux build kustomization ... --dry-run` without `--kustomization-file`. Current Flux requires a local Flux Kustomization file when dry-run mode is used, otherwise it returns `dry-run mode requires a kustomization file`. Updated the basic, overlay, comparison, and error examples to pass `--kustomization-file`.
- The pre-commit hook and bulk validation script iterated over Kustomize `kustomization.yaml` files and called `flux build kustomization test --path "$dir" --dry-run`, which is not valid dry-run usage for Flux. Updated both examples to discover Flux Kustomization resources from YAML files with `yq`, then pass each resource name, `.spec.path`, and the source file to `flux build kustomization`.

## Review Notes
- The local environment did not have the `flux` binary installed, so CLI behavior was verified against current official documentation and the Flux CLI source.
- Flux dry-run mode does not load substitutions from cluster Secrets or ConfigMaps; the post's literal `postBuild.substitute` example remains accurate.
