# Validation Summary: How to Use Post-Build Variable Substitution in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Kustomize post-build substitution
- Kubernetes ConfigMaps
- Kubernetes Secrets
- kubectl
- Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux build kustomization` documentation: https://v2-6.docs.fluxcd.io/flux/cmd/flux_build_kustomization/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The debugging command `flux build kustomization my-app` was incomplete for previewing a local manifest build. Updated it to `flux build kustomization my-app --path ./deploy`, matching the Flux CLI documentation examples that require a local path for the manifests.
- The multi-environment ConfigMap snippet contained two YAML resources in one fenced YAML block without a document separator. Added `---` before the production ConfigMap so the block is syntactically valid YAML.
- The status debugging command used the short resource name `kustomization`, which can be less clear in mixed Kubernetes contexts. Updated it to `kustomization.kustomize.toolkit.fluxcd.io` to explicitly target the Flux Kustomization CRD.

## Review Notes
- Flux documentation confirms that `spec.postBuild.substituteFrom` loads variables from ConfigMap and Secret data keys, later `substituteFrom` entries override earlier entries, and inline `spec.postBuild.substitute` values take precedence.
- Flux documentation confirms that missing `substituteFrom` references fail reconciliation by default and that `optional: true` treats absent references as empty.
- Flux documentation notes that undefined `${var}` placeholders are substituted with an empty string unless a default is provided, and that strict missing-variable behavior requires `StrictPostBuildSubstitutions` or `flux build --strict-substitute`. The post's default-value example is technically valid.
