# Validation Summary: How to Set Up Flux CD for Multi-Cluster GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Helm and Flux Helm Controller
- cert-manager
- ingress-nginx
- SOPS secret decryption
- Flux notification-controller

## Sources Consulted
- Flux GitHub bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitHub bootstrap guide: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `flux get` CLI documentation: https://fluxcd.io/flux/cmd/flux_get/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/v1beta3/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- ingress-nginx deployment documentation: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx project status notice: https://kubernetes.github.io/ingress-nginx/

## Issues Found
- The HelmRelease examples referenced `HelmRepository` objects that were not defined. Added `HelmRepository` resources for Jetstack and ingress-nginx so Flux can resolve the chart sources.
- The HelmRelease examples used the target application namespaces as the HelmRelease object namespaces. Changed the HelmRelease objects to live in `flux-system` and added `spec.targetNamespace`, because `install.createNamespace` creates the Helm target namespace, not the namespace containing the HelmRelease object.
- The cert-manager example used the older `installCRDs` value and an outdated chart range. Updated it to `crds.enabled: true` and `v1.20.x`, matching current cert-manager Helm documentation.
- The cert-manager ACME HTTP-01 solver used `class: nginx`. Updated it to `ingressClassName: nginx`, the recommended field for current cert-manager versions.
- The repository structure referenced `./apps/staging`, `./apps/production-us`, and `./apps/production-eu`, but those overlay directories were not shown. Added them to the structure.
- The application manifests used the `apps` namespace without showing namespace creation. Added `namespace.yaml` to the overlays and included it in the overlay resources.
- The Flux notification example used `notification.toolkit.fluxcd.io/v1` for `Provider` and `Alert`, but those resources are currently in `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.
- The notification section implied a single management-cluster Alert would monitor independently bootstrapped clusters. Reworded it to configure notifications in each cluster that send events to the same external destination.

## Review Notes
- The Flux bootstrap commands and `flux get` examples match the official CLI documentation, but the `flux` CLI was not installed locally, so command verification was performed against official docs rather than local `--help` output.
- ingress-nginx is now documented as retired after March 2026, with existing charts and images remaining available. It is still valid as an example artifact source, but future revisions should consider a maintained ingress or Gateway API controller.
