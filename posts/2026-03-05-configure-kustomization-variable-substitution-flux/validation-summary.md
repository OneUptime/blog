# Validation Summary: How to Configure Kustomization Variable Substitution in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization API (`kustomize.toolkit.fluxcd.io/v1`)
- Flux post-build variable substitution
- Kustomize
- Kubernetes manifests
- Kubernetes ConfigMaps
- Flux CLI
- kubectl

## Sources Consulted
- Flux Kustomization post-build variable substitution documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/#post-build-variable-substitution
- Flux kustomize-controller options and feature gates: https://fluxcd.io/flux/components/kustomize/options/
- Flux `flux build kustomization` command reference: https://v2-6.docs.fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux `flux envsubst` command reference: https://v2-6.docs.fluxcd.io/flux/cmd/flux_envsubst/
- Kubernetes ConfigMap API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.34/#configmap-v1-core

## Issues Found
- The ConfigMap default-value example placed numeric defaults directly in `data` values. After substitution, values such as `100` and `300` would be parsed as YAML numbers, but Kubernetes ConfigMap `data` values must be strings. Quoted the placeholders so the rendered ConfigMap remains valid.
- The default-value section did not mention Flux's documented requirement that substitution only runs when at least one inline substitute value or `substituteFrom` source is configured. Added a short caveat with a harmless placeholder variable.
- The post said values in `spec.postBuild.substitute` must be strings, but did not mention that substituted values also need quoting in Kubernetes string fields when the rendered value could look like a number or boolean. Added a concise note with an environment-variable example.
- The local verification section only showed `flux build kustomization`. Added the official `kustomize build ... | flux envsubst --strict` workflow for reproducing post-build substitutions locally.

## Review Notes
- The core use of `.spec.postBuild.substitute`, variable syntax, default values, missing-variable behavior, `StrictPostBuildSubstitutions`, and the `flux build kustomization` dry-run command align with official Flux documentation.
- The `flux build kustomization --dry-run` example is valid for inline substitutions from a local Flux Kustomization file. Flux documentation notes that substitutions loaded from Secrets and ConfigMaps are skipped in dry-run mode, but this post focuses on inline `substitute` values.
