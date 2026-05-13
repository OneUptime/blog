# Validation Summary: How to Use Post-Build Substitution with Secret References in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux post-build variable substitution
- Kubernetes Secrets and ConfigMaps
- Kustomize
- kubectl
- GitOps

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux `flux get kustomizations` CLI reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux v2.3 GA release notes: https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Flux installation requirements: https://fluxcd.io/flux/installation/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The prerequisites said Kubernetes 1.25 or later was sufficient for Flux v2.3 or later. Flux version support changes by release, and Flux v2.3 officially supported Kubernetes 1.28 through 1.30. Updated the wording to require a Kubernetes version supported by the Flux release in use.
- The default-values section said defaults prevent errors for missing variables. Flux substitutes undefined variables with an empty string by default, while missing variables fail only when strict post-build substitutions are enabled. Updated the wording to cover both default behavior and strict mode.
- The verification section said undefined variables without defaults are reported as substitution errors. Updated it to state Flux's default empty-string behavior and mention the `StrictPostBuildSubstitutions` feature gate for fail-fast behavior.
- The verification command used `flux get kustomization my-application`. The official Flux CLI reference documents the status command as `flux get kustomizations`, so the command was updated to `flux get kustomizations my-application`.

## Review Notes
The main Flux post-build substitution examples are technically valid: `postBuild.substituteFrom` supports Secret and ConfigMap references, inline `substitute` values take precedence over referenced values, and later `substituteFrom` entries overwrite earlier entries. The security section is accurate that substituted secret values become visible in the applied workload manifest when embedded directly as environment variable values.
