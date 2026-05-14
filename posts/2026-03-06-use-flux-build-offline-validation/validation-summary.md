# Validation Summary: How to Use flux build for Offline Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux Kustomization resources
- Kustomize
- Kubernetes manifests
- GitHub Actions
- kubeconform
- Bash

## Sources Consulted
- Flux CLI documentation for `flux build kustomization`: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux Kustomization documentation for post-build substitution: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Kubernetes Kustomize documentation for the `patches` field: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- kubeconform project and release documentation: https://github.com/yannh/kubeconform
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions

## Issues Found
- The post stated that `flux build` works entirely offline by default. Flux documentation says normal `flux build kustomization` can query the Kubernetes API, while dry-run mode with a local `--kustomization-file` is the offline path. I added `--dry-run` to the offline commands and clarified the explanation.
- The variable substitution section implied that `substituteFrom` values from ConfigMaps are validated offline. Flux documentation says ConfigMap and Secret substitutions are skipped in dry-run mode. I removed the `substituteFrom` example from the offline validation path and clarified that dry-run validates inline substitutions.
- The unresolved variable example said missing variables remain as raw `${MISSING_VAR}` strings. Flux documentation says undefined variables are substituted with an empty string unless strict substitution is enabled. I changed the example to use `--strict-substitute` and updated the explanation.
- The Kustomize overlay used `patchesStrategicMerge`, which is deprecated in favor of the `patches` field. I updated the snippet to use `patches`.
- The example directory tree listed `clusters/production/kustomization.yaml`, but the Flux Kustomization file used later is `clusters/production/infrastructure.yaml`. I corrected the directory tree.
- The validation script incremented `ERRORS` inside a piped `while` loop, which would lose the count in a Bash subshell. I changed it to use process substitution.
- The shell snippets used `grep` pipelines under `set -euo pipefail` without tolerating missing fields, which could exit before the intended skip logic. I added `|| true` to those field extraction commands.
- The GitHub Actions workflow used recursive globbing and `yq` without enabling/installing them, and it prepended `.` to paths that already start with `./`. I replaced the loop with `find`, removed the undeclared `yq` dependency, and passed the Flux path directly.

## Review Notes
The examples now focus on offline structural rendering. For full parity with a running Flux controller, especially when `substituteFrom` reads ConfigMaps or Secrets from the cluster, validation should also be run in an environment that can access those referenced objects or with equivalent local inline substitutions.
