# Validation Summary: How to Use Post-Build Substitution with Inline Variables in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux post-build variable substitution
- Kubernetes manifests
- Kustomize
- kubectl
- Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The section on combining inline variables with ConfigMap references contained a contradictory and incorrect precedence statement. Updated it to match Flux documentation: inline `spec.postBuild.substitute` values take precedence over values loaded through `substituteFrom`.
- The default-values Deployment example omitted pod template labels matching `.spec.selector.matchLabels`, which would make the Deployment invalid. Added `spec.template.metadata.labels.app: my-app`.
- Added the Flux caveat that substitution only runs when at least one inline variable or `substituteFrom` reference is configured, so manifests that only use default expressions need a placeholder variable.
- The multi-environment example used two Kustomizations against the same source path without separating their target resources. Added `targetNamespace` values for staging and production to avoid both examples applying the same resource identities.

## Review Notes
The remaining Flux field names, API versions, substitution syntax, escaping syntax, and verification commands are consistent with the current official Flux documentation. The examples assume the referenced namespaces exist or are created by manifests in the Kustomization, which is required when using `spec.targetNamespace`.
