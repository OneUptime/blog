# Validation Summary: Cost Reports for Flux CD Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Kubernetes
- HelmRelease and HelmRepository custom resources
- OpenCost
- Prometheus and Prometheus Operator PrometheusRule resources
- jq and curl

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/components/helm/helmreleases/
- OpenCost Helm installation documentation: https://opencost.io/docs/installation/helm/
- OpenCost Helm chart values.yaml: https://github.com/opencost/opencost-helm-chart/blob/main/charts/opencost/values.yaml
- OpenCost API documentation: https://opencost.io/docs/integrations/api/
- OpenCost API examples: https://opencost.io/docs/integrations/api-examples/
- OpenCost Prometheus metrics documentation: https://opencost.io/docs/integrations/metrics/
- OpenCost exporter documentation: https://opencost.io/docs/integrations/opencost-exporter/

## Issues Found
- The OpenCost Helm values used `opencost.cloudProvider.provider`, which is not a current chart value. Changed it to `opencost.customPricing.enabled` and `opencost.customPricing.provider`, matching the official chart values.
- The OpenCost UI value was shown as top-level `ui.enabled`, but the chart expects `opencost.ui.enabled`. Moved the value under `opencost`.
- The Prometheus example used `opencost.prometheus.external` for an in-cluster service URL. Changed it to the chart's `opencost.prometheus.internal` fields: `namespaceName`, `serviceName`, and `port`.
- The OpenCost HelmRelease pinned chart version `1.x`, while the current OpenCost chart is `2.x`. Updated the version constraint to `2.x` so the example matches the current chart values.
- The OpenCost API examples port-forwarded and queried port `9090`, which is the UI port in the chart. Changed API access to port `9003`, the documented OpenCost API/exporter port.
- The namespace-specific API example used an undocumented allocation filter syntax. Changed it to aggregate by namespace and select the `production` allocation with `jq`.
- The text implied `podLabels` is universal for Helm charts. Qualified it as chart-supported because Helm values are chart-specific.
- The Prometheus alert multiplied CPU usage by total node hourly cost, which does not match OpenCost's documented cost metrics. Replaced it with the documented CPU and memory allocation cost expression using `container_cpu_allocation`, `container_memory_allocation_bytes`, `node_cpu_hourly_cost`, and `node_ram_hourly_cost`.

## Review Notes
OpenCost allocation by labels depends on those labels being present on the pods or other Kubernetes objects that OpenCost observes. The example is valid for charts that propagate `podLabels`; other charts may require different values or a Flux/Helm post-render patch.
