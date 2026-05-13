# Validation Summary: How to Deploy Monitoring Stack to All Clusters with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes
- HelmRelease
- Kustomization
- kube-prometheus-stack
- Prometheus
- Prometheus Operator
- Alertmanager
- Grafana
- Thanos

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization post-build substitution documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI get kustomizations documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- prometheus-community kube-prometheus-stack README and chart metadata: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- prometheus-community kube-prometheus-stack values.yaml: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Grafana dashboard provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Thanos sidecar documentation: https://thanos.io/v0.36/components/sidecar.md/

## Issues Found
- The kube-prometheus-stack HelmRelease example pinned `version: "55.x"`, which is outdated for the current chart line. Updated it to `version: "85.x"` after checking the current prometheus-community chart metadata.
- The architecture text and diagram implied that Thanos sidecars were deployed by the shown values, but the values do not configure the kube-prometheus-stack Thanos sidecar or Thanos services. Clarified that Thanos is separately configured and marked the sidecar path as optional in the diagram.
- The AlertmanagerConfig example used `monitoring.coreos.com/v1alpha1`. Updated it to the current `monitoring.coreos.com/v1beta1` API version from the Prometheus Operator API reference.
- The custom Grafana dashboard ConfigMap used an API import-style wrapper with a top-level `dashboard` object. Grafana file provisioning expects a dashboard JSON model, so the example was changed to a provisionable dashboard JSON object with `uid`, `title`, `schemaVersion`, `panels`, and `gridPos`.

## Review Notes
- The Flux `valuesFrom`, CRD install/upgrade policy, and Kustomization `postBuild.substituteFrom` examples match Flux documentation.
- The Prometheus retention time and retention size examples use units supported by Prometheus.
- The AlertmanagerConfig resource still requires the referenced Slack and PagerDuty Secrets to exist in the same namespace and be selectable by the kube-prometheus-stack Alertmanager configuration.
