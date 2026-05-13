# Validation Summary: Manage Grafana Dashboards as Code with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Grafana
- Grafana Helm chart
- Grafana dashboard provisioning
- Kustomize
- ConfigMaps

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Grafana Helm chart repository and values: https://github.com/grafana/helm-charts and https://raw.githubusercontent.com/grafana/helm-charts/main/charts/grafana/values.yaml
- Grafana Helm chart index: https://grafana.github.io/helm-charts/index.yaml
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Kustomize deprecation discussion for commonLabels: https://github.com/kubernetes-sigs/kustomize/issues/5436

## Issues Found
- The Grafana Helm chart example used `version: "7.*"`, which is stale compared with the current Grafana chart series. Updated it to `version: "10.*"` after checking the official Grafana Helm chart index, where the latest listed Grafana chart version is 10.5.15.
- The Kustomize example used `commonLabels`. Kustomize has moved toward the `labels` transformer, and `commonLabels` is deprecated in current Kustomize usage. Replaced it with `labels` and `includeSelectors: false`.
- The Flux `dependsOn` example implied it directly ensured the Grafana `HelmRelease` was running. Flux Kustomization `dependsOn` references other Flux `Kustomization` objects, so the surrounding explanation and inline comment were corrected to state that it depends on a separate Flux Kustomization that deploys Grafana.

## Review Notes
- The Grafana sidecar values for dashboard discovery, including `label`, `labelValue`, `searchNamespace`, `folderAnnotation`, and `provider.foldersFromFilesStructure`, match the official Grafana Helm chart values.
- The Flux `HelmRelease` and `Kustomization` API versions used in the examples are current.
- The dashboard ConfigMap example is syntactically valid YAML, and Grafana provisioning documentation supports stable dashboard UIDs and omitting the dashboard `id` field for provisioned dashboards.
- All YAML snippets in the post were parsed successfully after the edits.
