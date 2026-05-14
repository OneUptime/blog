# Validation Summary: How to Deploy OpenCost with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenCost
- Flux CD
- Kubernetes
- Helm and HelmRelease
- Kustomize and Flux Kustomization
- Prometheus
- Kubernetes RBAC
- Kubernetes Ingress

## Sources Consulted
- OpenCost Helm installation documentation: https://opencost.io/docs/installation/helm/
- OpenCost Prometheus installation documentation: https://opencost.io/docs/installation/prometheus/
- OpenCost on-premises custom pricing documentation: https://opencost.io/docs/configuration/on-prem/
- OpenCost API documentation: https://opencost.io/docs/integrations/api/
- OpenCost Helm chart values: https://github.com/opencost/opencost-helm-chart/blob/main/charts/opencost/values.yaml
- OpenCost Helm chart service and deployment templates: https://github.com/opencost/opencost-helm-chart/tree/main/charts/opencost/templates
- Prometheus community Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus/values.yaml
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI documentation for `flux reconcile helmrelease`: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/

## Issues Found
- The Prometheus Helm values used `pushgateway` and `nodeExporter`, but the current prometheus-community chart uses `prometheus-pushgateway` and `prometheus-node-exporter`. Updated the values so those subcharts are configured correctly.
- The Prometheus example replaced `serverFiles.prometheus.yml` with a minimal kubelet scrape config. Updated it to use the chart-supported `extraScrapeConfigs` field with the OpenCost scrape config recommended by OpenCost documentation.
- The OpenCost HelmRelease set `PROMETHEUS_SERVER_ENDPOINT` and `CLUSTER_ID` through `opencost.exporter.extraEnv`. Updated the example to use the chart's supported `opencost.prometheus.internal` fields and `opencost.exporter.defaultClusterId` / `cloudProviderApiKey` values.
- The custom pricing example created a standalone ConfigMap that was not connected to the OpenCost chart. Replaced it with the chart-supported `opencost.customPricing` Helm values.
- The RBAC section implied Kubernetes RBAC could make teams view only their own OpenCost cost data. Clarified that RBAC grants Kubernetes metadata access, while OpenCost filtering is done through namespace and label aggregation in API queries.
- The Flux Kustomization example used a `dependsOn` entry for a non-existent Flux Kustomization named `prometheus`. Removed that dependency because HelmRelease `dependsOn` already orders OpenCost after Prometheus.
- The Flux Kustomization health check targeted the Helm-managed Deployment directly. Updated it to health-check the Prometheus and OpenCost HelmRelease resources, which is the pattern documented by Flux for Kustomizations containing HelmRelease objects.
- The repository structure mixed the Flux Kustomization custom resource with the Kustomize `kustomization.yaml` file. Updated the structure and examples so the Flux Kustomization lives at `clusters/production/opencost.yaml` and the resource directory contains a Kustomize `kustomization.yaml`.

## Review Notes
The guide is technically valid after the fixes. In a production environment, users should still adapt Prometheus retention, storage class, Ingress authentication, TLS secrets, and OpenCost pricing/cloud integration values to their cluster and cloud provider.
