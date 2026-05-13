# Validation Summary: How to Deploy Kong Gateway with PostgreSQL via Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease
- HelmRepository
- Kong Gateway
- Kong Ingress Controller
- PostgreSQL
- Bitnami PostgreSQL Helm chart
- kubectl
- decK

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Kong Helm charts repository and chart documentation: https://github.com/Kong/charts
- Kong `kong/kong` chart values for chart 2.30.0: https://raw.githubusercontent.com/Kong/charts/kong-2.30.0/charts/kong/values.yaml
- Kong Gateway configuration reference: https://developer.konghq.com/gateway/configuration/
- Kong Gateway Admin API documentation: https://docs.konghq.com/gateway/latest/admin-api/
- Kong Manager documentation: https://developer.konghq.com/gateway/kong-manager/
- Kong decK Gateway documentation: https://developer.konghq.com/deck/gateway/
- Bitnami PostgreSQL Helm chart values: https://github.com/bitnami/charts/tree/main/bitnami/postgresql
- Kubernetes `kubectl create secret generic` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes `kubectl port-forward` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The PostgreSQL HelmRelease referenced a `bitnami` HelmRepository, but the post only created the Kong HelmRepository. Added the Bitnami HelmRepository using the official `https://charts.bitnami.com/bitnami` repository URL.
- The Kong Helm values included `ingressController.installCRDs: false`, which is not a supported value in the referenced `kong/kong` chart version range. Removed the unsupported field.
- The verification commands used `flux get helmrelease`, while the documented Flux command for listing HelmRelease statuses is `flux get helmreleases`. Updated both commands.
- The introduction implied Kong Manager is enabled simply by using a PostgreSQL backend. Updated the wording to clarify that Kong Manager requires the appropriate Kong Gateway setup.

## Review Notes
- The tutorial remains valid for the pinned Kong chart range `>=2.30.0 <3.0.0` and Bitnami PostgreSQL chart range `>=13.0.0 <14.0.0`.
- The examples assume the `kong` namespace and database credential secret exist before Flux reconciles the HelmReleases. For a stricter GitOps setup, these could be represented as managed manifests or external secret resources in the same Kustomization path.
