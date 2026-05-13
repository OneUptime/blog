# Validation Summary: How to Use Post-Build Substitution for Environment-Specific Config in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Flux Kustomization
- GitOps
- Kubernetes
- Kustomize
- ConfigMaps
- Secrets
- Ingress

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux v2.3 release notes: https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Kubernetes API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/

## Issues Found
- The prerequisites stated that Kubernetes 1.25 or later was sufficient for Flux v2.3 or later. Flux v2.3 upstream support covered Kubernetes 1.28, 1.29, and 1.30, while current Flux releases support newer Kubernetes versions. Updated the prerequisite to require a Kubernetes version supported by the installed Flux release and to list the Flux v2.3 supported versions.
- The base manifests deployed resources into substituted namespaces such as `staging` and `production`, but did not create those namespaces. Added a `Namespace` manifest using `${APP_NAMESPACE}` so the example can apply successfully in a fresh environment.

## Review Notes
The Flux `postBuild.substituteFrom` usage, ConfigMap and Secret references, default substitution syntax, and `kustomize.toolkit.fluxcd.io/v1` Kustomization API fields match the current Flux documentation. The Kubernetes Deployment, Service, Secret, ConfigMap, Namespace, and Ingress snippets use current stable APIs.
