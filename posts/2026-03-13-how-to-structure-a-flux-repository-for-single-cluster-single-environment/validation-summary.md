# Validation Summary: How to Structure a Flux Repository for Single Cluster Single Environment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes
- GitOps
- Kustomize
- Helm
- cert-manager
- ingress-nginx

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitHub bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- cert-manager continuous deployment and GitOps documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager GitHub releases: https://github.com/cert-manager/cert-manager/releases

## Issues Found
- The cert-manager HelmRepository example used the legacy HTTP chart repository URL. Updated it to use the OCI chart source (`oci://quay.io/jetstack/charts`) with `spec.type: oci`, matching current cert-manager Flux guidance and Flux HelmRepository support for OCI sources.
- The cert-manager HelmRelease was placed in the `cert-manager` namespace without creating that namespace first. Moved the HelmRelease object to `flux-system` and added `targetNamespace: cert-manager` plus `install.createNamespace: true`, matching Flux and cert-manager installation guidance.
- The cert-manager Helm values used `installCRDs: true`. Updated the values to `crds.enabled: true`, which current cert-manager documentation recommends so Flux can install and upgrade CRDs.
- The cert-manager chart version was pinned to the older `1.14.x` release series. Updated it to `1.20.x`, which is a current supported cert-manager release series as of the validation date.
- The bootstrap command used `--path=./clusters/my-cluster`. Updated it to `--path=clusters/my-cluster` to match the Flux CLI documentation, which describes the value as a path relative to the repository root.

## Review Notes
- The local environment did not have the `flux` CLI installed, so CLI validation was performed against official Flux command documentation rather than local `--help` output.
- The repository layout and Flux `Kustomization` examples are valid for a single-cluster, single-environment setup. For larger production setups, separating CRDs, controllers, and custom resources into distinct Flux Kustomizations can provide stricter rollout ordering, but that is beyond the scope of this introductory structure.
