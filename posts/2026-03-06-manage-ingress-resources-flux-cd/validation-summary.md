# Validation Summary: How to Manage Ingress Resources with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Kubernetes Ingress
- ingress-nginx
- cert-manager
- Helm
- Kustomize
- kubectl

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Helm releases guide: https://fluxcd.io/flux/guides/helmreleases/
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx Helm repository index: https://kubernetes.github.io/ingress-nginx/index.yaml
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Helm chart values: https://github.com/cert-manager/cert-manager/blob/master/deploy/charts/cert-manager/values.yaml
- Jetstack Helm repository index: https://charts.jetstack.io/index.yaml

## Issues Found
- The ingress-nginx `HelmRelease` was declared in the `ingress-nginx` namespace while relying on `install.createNamespace`. A Kubernetes object cannot be created in a namespace that does not yet exist, and Flux `targetNamespace` defaults to the HelmRelease namespace. Changed the HelmRelease namespace to `flux-system` and added `targetNamespace: ingress-nginx`.
- The ingress-nginx chart values used `controller.podDisruptionBudget.enabled/minAvailable`, but the current ingress-nginx chart exposes the controller PodDisruptionBudget setting as `controller.minAvailable`. Updated the values accordingly.
- The basic Ingress example used `nginx.ingress.kubernetes.io/rewrite-target: /` with a comment saying it specified the ingress controller class. The class is specified by `spec.ingressClassName`; the rewrite annotation was unnecessary and could rewrite all paths to `/`. Removed the annotation.
- The cert-manager example referenced a `jetstack` `HelmRepository` but did not define it. Added the missing `HelmRepository` using `https://charts.jetstack.io`.
- The cert-manager `HelmRelease` had the same namespace creation issue as the ingress-nginx release. Changed the HelmRelease namespace to `flux-system` and added `targetNamespace: cert-manager`.
- The cert-manager chart values used the older `installCRDs` key. Current cert-manager Helm documentation uses `crds.enabled=true`, so the example was updated to `crds.enabled: true`.
- The Kustomize overlay examples used JSON Patch `replace` operations for `/spec/tls/0/hosts/0`, but the base Ingress example had no `spec.tls` field. Replaced those operations with `add` operations that create the TLS list and environment-specific secret names.

## Review Notes
The remaining examples use current Kubernetes `networking.k8s.io/v1` Ingress fields, Flux v2 APIs, cert-manager Ingress annotations, and ingress-nginx annotations. The verification commands are standard, but `kubectl` and `flux` were not installed locally in this workspace, so command execution was checked against documentation rather than run against a cluster.
