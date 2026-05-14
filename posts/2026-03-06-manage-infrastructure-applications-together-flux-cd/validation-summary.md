# Validation Summary: How to Manage Infrastructure and Applications Together with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Flux HelmRelease API
- Kubernetes
- Kustomize
- Helm
- cert-manager
- ingress-nginx
- kube-prometheus-stack

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- cert-manager Helm installation documentation: https://cert-manager.io/v1.16-docs/installation/helm/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The HelmRelease examples used component namespaces such as `cert-manager`, `ingress-nginx`, and `monitoring` as the HelmRelease metadata namespace. This can fail because the HelmRelease custom resource namespace must already exist before Kustomize applies the object. Updated the HelmRelease objects to live in `flux-system` and added `spec.targetNamespace` for the actual chart install namespace.
- The cert-manager Helm values used `installCRDs: true` with chart version `1.16.x`. The cert-manager 1.16 Helm documentation uses `crds.enabled=true`, so the example now uses `crds.enabled: true`.
- The Flux infrastructure Kustomization set `wait: true` and also defined `healthChecks`, but Flux documentation states that `healthChecks` are ignored when `wait` is true. Removed `wait: true` and changed the checks to wait on the HelmRelease resources directly.
- The cert-manager HTTP-01 solver used `ingress.class`. cert-manager documents `ingressClassName` as the recommended field for most ingress controllers, so the ClusterIssuer examples now use `ingressClassName: nginx`.
- The application Ingress used the older `kubernetes.io/ingress.class` annotation. Kubernetes documents `spec.ingressClassName` as the replacement, so the Ingress example now uses `spec.ingressClassName: nginx`.

## Review Notes
The examples are still version-pinned to older chart ranges (`cert-manager` 1.16.x, `ingress-nginx` 4.11.x, and `kube-prometheus-stack` 65.x). They are valid as version-specific examples, but future updates should review chart values against the selected chart versions before bumping them.
