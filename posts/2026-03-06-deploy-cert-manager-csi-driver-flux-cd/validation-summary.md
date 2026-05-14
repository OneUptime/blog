# Validation Summary: How to Deploy cert-manager CSI Driver with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux CD
- Flux HelmRelease and Kustomization APIs
- cert-manager
- cert-manager CSI driver
- Helm
- TLS and mTLS certificate provisioning

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager supported releases documentation: https://cert-manager.io/docs/releases/
- cert-manager CSI driver installation documentation: https://cert-manager.io/docs/usage/csi-driver/installation/
- cert-manager CSI driver usage and volume attributes documentation: https://cert-manager.io/docs/usage/csi-driver/
- Flux HelmRelease documentation: https://fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Jetstack Helm chart index: https://charts.jetstack.io/index.yaml
- cert-manager and cert-manager CSI driver packaged Helm chart values from https://charts.jetstack.io/

## Issues Found
- The cert-manager chart version was pinned to `1.16.x`, which is no longer a supported cert-manager release as of 2026-05-14. Updated the guide to use the supported `v1.20.x` chart line and adjusted the Kubernetes prerequisite to cert-manager v1.20's supported Kubernetes range.
- The cert-manager HelmRelease used Flux CRD handling but did not enable the chart's `crds.enabled` value. Added `crds.enabled: true`, matching the current cert-manager Helm installation guidance.
- The cert-manager CSI driver chart version was pinned to `0.10.x`, which is outdated. Updated it to `v0.14.x`, the current chart line available from the Jetstack chart repository.
- The CSI driver Helm values included unsupported `livenessProbe`, `nodeDriverRegistrar.resources`, and `livenessProbeImage.resources` keys. Removed those values because the chart only applies `resources` to the main CSI driver container.
- The Flux Kustomization example was shown as `clusters/my-cluster/cert-manager/kustomization.yaml`, which conflicts with Flux's build path because that file name is reserved for Kustomize configuration in the reconciled directory. Moved the Flux Kustomization manifest to `clusters/my-cluster/cert-manager-flux-kustomization.yaml` in the repository structure and snippet.
- The mTLS section claimed to configure two services, but the example only shows one additional client workload and does not configure application-level mTLS. Clarified that application-level mTLS configuration is still required.

## Review Notes
- The Jetstack HTTP Helm repository at `https://charts.jetstack.io` remains available, but current cert-manager documentation recommends OCI charts for recent versions. The HTTP repository example is still technically valid.
- The CSI driver volume attributes for issuer name/kind, DNS names, duration, renewal, key algorithm/size, and output file names match the official CSI driver documentation.
