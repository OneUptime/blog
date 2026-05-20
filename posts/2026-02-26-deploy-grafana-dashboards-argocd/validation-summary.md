# Validation Summary: How to Deploy Grafana Dashboards with ArgoCD

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes ConfigMaps
- kube-prometheus-stack
- Grafana dashboard provisioning
- Grafana Helm chart sidecar
- Grafana Operator
- Jsonnet and Grafonnet
- Kustomize

## Sources Consulted
- Grafana dashboard provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Helm chart values: https://github.com/grafana/helm-charts/blob/main/charts/grafana/values.yaml
- kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Grafana Operator dashboard documentation: https://grafana.com/docs/grafana/latest/as-code/infrastructure-as-code/grafana-operator/operator-dashboards-folders-datasources/
- Grafana Operator dashboard-from-URL example: https://grafana.github.io/grafana-operator/docs/examples/dashboard/url/readme/
- Grafana Operator datasource mapping example: https://grafana.github.io/grafana-operator/docs/examples/datasource/datasource_mapping/readme/
- Grafonnet dashboard API documentation: https://grafana.github.io/grafonnet/API/dashboard/index.html
- Grafonnet Prometheus query API documentation: https://grafana.github.io/grafonnet/API/query/prometheus.html
- Grafonnet simple dashboard example: https://grafana.github.io/grafonnet/examples/simple.html
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/config-management-plugins/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The Grafonnet example used the older `grafonnet/grafana.libsonnet`, `graphPanel`, and `.addPanel()` style API. Updated it to the current documented Grafonnet import path and API style using `g.dashboard`, `g.panel.timeSeries`, and `g.query.prometheus`.
- The Argo CD CMP example inserted pretty-printed Jsonnet output under a YAML literal block without indenting every generated JSON line, which would produce invalid YAML for multiline output. Updated the command to indent the generated JSON with `sed` and added `-J vendor` so vendored Grafonnet imports resolve.
- The kube-prometheus-stack/Grafana Helm values snippet used `disableDeletion`, which is the Grafana provisioning file field, not the Helm chart value. Updated it to the chart's `disableDelete` value.
- The lifecycle-management text said the sidecar will delete dashboards after ConfigMap pruning without qualifying the earlier `disableDelete: true` setting. Added the caveat that deletion happens only when `disableDelete` is not enabled.

## Review Notes
The Grafana Operator examples are valid for `grafana.integreatly.org/v1beta1`. For Grafana.com community dashboards, the operator also supports the dedicated `grafanaCom` field, which may be preferable to a direct download URL in future revisions.
