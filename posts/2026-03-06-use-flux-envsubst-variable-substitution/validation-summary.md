# Validation Summary: How to Use flux envsubst for Variable Substitution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux Kustomization post-build substitution
- Kubernetes manifests
- Bash shell scripting
- kubectl validation commands

## Sources Consulted
- Flux CLI `flux envsubst` documentation: https://fluxcd.io/flux/cmd/flux_envsubst/
- Flux Kustomization post-build substitution documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/#post-build-variable-substitution
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes well-known annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Flux CLI v2.8.6 local help/output from the official GitHub release binary

## Issues Found
- The strict-mode example showed an outdated/inaccurate error message. Updated it to match the current Flux CLI output: `variable not set (strict mode): "MISSING_VAR"`.
- The default-values Deployment example was missing the required `.spec.selector` for an `apps/v1` Deployment. Added a selector and matching pod template labels.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName`, which is the current Kubernetes field for selecting an IngressClass.

## Review Notes
The `flux envsubst` command is still marked as preview in Flux documentation. The examples otherwise align with Flux's documented stdin-based substitution, `--strict` behavior, default-value syntax, and Kustomization `postBuild.substitute` / `substituteFrom` fields.
