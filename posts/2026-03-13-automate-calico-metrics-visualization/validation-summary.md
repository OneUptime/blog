# Validation Summary: How to Automate Calico Metrics Visualization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Felix metrics
- Kubernetes ConfigMaps
- Grafana dashboard sidecar provisioning
- Grafana HTTP API
- Flux Kustomization
- Prometheus / PromQL
- Grafonnet / Jsonnet

## Sources Consulted
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Flux documentation: Kustomization spec - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Grafana documentation: Dashboard JSON model - https://grafana.com/docs/grafana/latest/reference/dashboard/
- Grafana documentation: Dashboard HTTP API - https://grafana.com/docs/grafana/latest/http_api/dashboard/
- Grafana Operator documentation: Dashboard from ConfigMap via sidecar example - https://grafana.github.io/grafana-operator/docs/examples/grafana/configmaps_sidecar/readme/
- Grafana Helm chart values on Artifact Hub: dashboard sidecar folderAnnotation - https://artifacthub.io/packages/helm/grafana/grafana?modal=values&path=sidecar.dashboards.folderAnnotation
- kiwigrid k8s-sidecar documentation - https://github.com/kiwigrid/k8s-sidecar
- Prometheus documentation: histogram_quantile examples - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Grafonnet documentation: dashboard API - https://grafana.github.io/grafonnet/API/dashboard/index.html
- Grafonnet documentation: simple dashboard example - https://grafana.github.io/grafonnet/examples/simple.html
- Grafonnet documentation: Prometheus query API - https://grafana.github.io/grafonnet/API/query/prometheus.html
- Grafonnet README - https://github.com/grafana/grafonnet

## Issues Found
- The description mentioned Grafana Operator, but the post's implementation uses ConfigMaps plus a Grafana dashboard sidecar. Changed the description to say "a Grafana dashboard sidecar" to match the actual mechanism.
- The ConfigMap used `grafana_folder` as a label. The sidecar filters by label, but folder placement is configured through a folder annotation mechanism. Moved `grafana_folder` under `metadata.annotations` and added a note that `sidecar.dashboards.folderAnnotation` must be configured to use it.
- The sample Felix policy panel used the raw `felix_active_local_policies` metric while calling the panel "by Node". Changed the panel to aggregate by `instance` and updated the title to "by Instance", avoiding an unsupported assumption that the metric has a `node` label.
- The Grafonnet snippet used an older import path and builder-style API that does not match current generated Grafonnet documentation. Rewrote it with the current `github.com/grafana/grafonnet/gen/grafonnet-latest/main.libsonnet` import, `withPanels`, panel query options, and Prometheus query helpers.
- The p99 PromQL used `histogram_quantile` directly over raw bucket rates. Updated it to aggregate bucket rates with `sum by (le, instance)` before calling `histogram_quantile`, matching Prometheus histogram query guidance and the legend label used in the panel.

## Review Notes
The Flux Kustomization fields, Grafana dashboard API endpoints used in the test script, Kubernetes ConfigMap structure, and referenced Calico Felix metric names are current and technically valid. I could not execute the Jsonnet/YAML examples locally because `jsonnet`, `go-jsonnet`, `yamllint`, and `yq` are not installed in the environment; validation was performed against official documentation and authoritative project sources.
