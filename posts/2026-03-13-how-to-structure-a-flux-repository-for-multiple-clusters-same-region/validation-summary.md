# Validation Summary: How to Structure a Flux Repository for Multiple Clusters Same Region

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux Kustomization API
- Flux HelmRelease API
- Flux bootstrap CLI
- Kubernetes
- Kustomize
- cert-manager Helm chart
- SOPS secret decryption

## Sources Consulted
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization guide, including postBuild substitution and SOPS decryption: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux bootstrap GitHub CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitHub bootstrap guide: https://fluxcd.io/flux/installation/bootstrap/github/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager high availability best practices: https://cert-manager.io/v1.16-docs/installation/best-practice/

## Issues Found
- The cert-manager HelmRelease used chart version `1.14.x` with `installCRDs: true`. Current cert-manager Helm documentation recommends modern chart versions and `crds.enabled=true`, while `installCRDs` is the older value. Updated the example to `version: "v1.20.x"` and `crds.enabled: true`.
- The production overlay introduction said it increased replicas and resource limits, but the shown patch only increased replicas and enabled a PodDisruptionBudget. Updated the sentence to describe replicas and a disruption budget.
- The SOPS decryption example showed only the `decryption` block under a separate `sops-config.yaml`, missing required Flux Kustomization fields such as `interval`, `path`, and `sourceRef`. Updated the example to show the decryption settings inside the `clusters/production/apps.yaml` Kustomization with the required fields.

## Review Notes
The Flux Kustomization API version, HelmRelease API version, `dependsOn`, `postBuild.substitute`, Kustomize `patches`, Kustomize `images`, and `flux bootstrap github` flags were checked against current official documentation and are technically valid.
