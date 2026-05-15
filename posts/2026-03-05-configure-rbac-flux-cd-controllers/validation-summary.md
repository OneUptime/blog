# Validation Summary: How to Configure RBAC for Flux CD Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- Kustomization custom resources
- HelmRelease custom resources
- Source Toolkit custom resources
- kubectl
- Flux CLI

## Sources Consulted
- Flux Security Documentation: https://fluxcd.io/flux/security/
- Flux Multi-tenancy Configuration: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomization Documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API Reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm Controller Options: https://fluxcd.io/flux/components/helm/options/
- Flux Source Controllers Documentation: https://fluxcd.io/flux/components/source/
- Flux latest install manifests: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Kubernetes RBAC Documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kubectl auth can-i Documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The controller list omitted the current `source-watcher` controller installed by Flux. Added `source-watcher` with its ArtifactGenerator responsibility.
- The source-controller description omitted current source API types managed by Flux. Added `HelmChart` and `ExternalArtifact` to the source-controller bullet.
- The source writer RBAC example only covered `source.toolkit.fluxcd.io`, but current Flux also includes source extension resources such as `ArtifactGenerator` under `source.extensions.fluxcd.io`. Added a matching namespace-scoped RBAC rule for that API group.

## Review Notes
The Kustomization and HelmRelease `.spec.serviceAccountName` examples are accurate for Flux's current APIs, and the `--default-service-account` guidance matches current Flux controller options. The RBAC examples are intentionally scoped examples; real Helm charts may require additional permissions for resources such as Jobs, Ingresses, or CRDs.
