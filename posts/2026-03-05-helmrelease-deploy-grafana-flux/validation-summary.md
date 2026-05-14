# Validation Summary: How to Use HelmRelease for Deploying Grafana with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRepository and HelmRelease APIs
- Kubernetes Namespace, Secret, ConfigMap, Service, Ingress, and port-forwarding
- Grafana Helm chart
- Grafana provisioning for data sources and dashboards
- Prometheus and Loki data sources

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Grafana Helm charts repository: https://github.com/grafana/helm-charts
- Grafana Helm chart values: https://raw.githubusercontent.com/grafana/helm-charts/main/charts/grafana/values.yaml
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Helm chart repository index: https://grafana.github.io/helm-charts/index.yaml
- Grafana dashboard pages for IDs 7249, 1860, and 9614: https://grafana.com/grafana/dashboards/

## Issues Found
- The HelmRelease example placed the resource in the `monitoring` namespace but did not create that namespace. Added a `Namespace` manifest before the HelmRelease so Kubernetes can store the namespaced custom resource.
- The admin Secret section did not mention that inline `adminUser` and `adminPassword` values override `valuesFrom`. Added guidance to remove those inline values before using the Secret references.
- The custom dashboard ConfigMap example used the sidecar discovery pattern while the main chart values already used `dashboardProviders` and `dashboards`. Replaced that with the chart-supported `dashboardsConfigMaps` pattern and a separate dashboard provider file.
- The custom dashboard JSON was wrapped in a `dashboard` object, which is the HTTP API shape rather than the raw dashboard model expected for file provisioning. Changed it to raw dashboard JSON.
- The Flux verification command used `flux get helmrelease`; updated it to the documented `flux get helmreleases`.
- The curl example used a password that did not match the inline example value. Updated it to `changeme-use-secret-in-production`.

## Review Notes
- The chart version selector `8.x` is older than the latest available Grafana chart line, but it is a valid semver range and matching chart versions are still present in the Grafana Helm repository index.
- The Grafana dashboard IDs used in the examples currently resolve on grafana.com.
