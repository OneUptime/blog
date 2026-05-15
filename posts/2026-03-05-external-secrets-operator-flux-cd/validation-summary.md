# Validation Summary: How to Use External Secrets Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- External Secrets Operator (ExternalSecret, SecretStore, ClusterSecretStore)
- Flux CD (HelmRepository, HelmRelease, Kustomization, Flux CLI)
- Kubernetes Secrets and Kustomize manifests
- AWS Secrets Manager provider configuration

## Sources Consulted
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator v0.16.0 release notes: https://github.com/external-secrets/external-secrets/releases/tag/v0.16.0
- External Secrets Operator v0.17.0 release notes: https://github.com/external-secrets/external-secrets/releases/tag/v0.17.0
- External Secrets Operator Helm chart package: https://artifacthub.io/packages/helm/external-secrets-operator/external-secrets
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI reconcile kustomization documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found

1. **ESO CR examples used the removed `external-secrets.io/v1beta1` API.** External Secrets Operator v0.17.0 stopped serving `v1beta1` for ExternalSecret, SecretStore, ClusterSecretStore, and related resources. Updated all ESO custom resources to `apiVersion: external-secrets.io/v1`.

2. **The Helm chart version range was too old for the updated API examples.** The post used `version: ">=0.9.0"`, but `external-secrets.io/v1` was promoted in v0.16.x and v0.17.0 is the release where manifests must use v1. Updated the HelmRelease chart constraint to `version: ">=0.17.0"` so the installation supports the API version shown in the examples.

## Review Notes
- The Flux HelmRelease CRD install and upgrade policies are valid. The External Secrets chart also defaults to installing CRDs, so the explicit `installCRDs: true` is redundant but correct.
- The AWS SecretStore static credential examples are syntactically valid. In production, workload identity such as IRSA/EKS Pod Identity is usually preferable to long-lived AWS access keys, but the static key example is still supported.
- The Flux CLI command `flux reconcile kustomization my-app --with-source` is valid and uses the default `flux-system` namespace.
