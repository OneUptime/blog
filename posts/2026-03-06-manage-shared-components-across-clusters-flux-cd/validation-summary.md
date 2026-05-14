# Validation Summary: How to Manage Shared Components Across Clusters with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Helm
- cert-manager
- ingress-nginx
- kube-prometheus-stack
- Grafana Helm chart values

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI command reference for HelmReleases and Kustomizations: https://fluxcd.io/flux/cmd/flux_get_helmreleases/ and https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager continuous deployment with Flux documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- ingress-nginx installation documentation: https://kubernetes.github.io/ingress-nginx/deploy/
- kube-prometheus-stack chart values: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/values.yaml
- Grafana Helm chart values: https://raw.githubusercontent.com/grafana/helm-charts/main/charts/grafana/values.yaml

## Issues Found
- The repository structure and sources kustomization listed `helm-bitnami.yaml`, but the examples never used Bitnami and the ingress-nginx HelmRelease referenced a missing `ingress-nginx` HelmRepository. Replaced it with `helm-ingress-nginx.yaml` and added the official ingress-nginx Helm repository URL.
- The cert-manager example used the older `installCRDs` chart value with an old `1.14.x` chart line. Updated the example to `1.20.x` and `crds.enabled: true`, matching current cert-manager documentation for Flux/Helm installs.
- The kube-prometheus-stack Grafana existing-secret example used `grafana.adminPassword.existingSecret`, which is not the chart's expected shape. Updated it to `grafana.admin.existingSecret` with `userKey` and `passwordKey`.
- The cluster-specific overlay example changed the Flux Kustomization name from the earlier `infra-shared` object to `infra-components`, which would create a naming mismatch for later suspend/resume commands. Updated the example to keep the `infra-shared` name and clarified that only the shared-component Kustomization path is being changed.
- Updated the cert-manager semver-range example from `>=1.14.0 <1.15.0` to `>=1.20.0 <1.21.0` so it matches the corrected chart version line.

## Review Notes
- Flux `apiVersion` values, `dependsOn`, `sourceRef`, `path`, `prune`, HelmRelease `install.crds` / `upgrade.crds`, and the listed Flux CLI commands are valid in current Flux documentation.
- The ingress-nginx documentation notes project retirement after March 2026: existing Helm charts and images remain available, but users should consider long-term maintenance and security implications for new deployments.
