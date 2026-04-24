# Validation Summary: How to Deploy Prometheus Stack with Helm and OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- Helm
- Kubernetes
- Prometheus Operator / kube-prometheus-stack
- Prometheus
- Alertmanager
- Grafana
- PrometheusRule custom resources

## Sources Consulted
- Prometheus community `kube-prometheus-stack` chart README: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/README.md
- Prometheus community `kube-prometheus-stack` values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus community package page for the latest published `kube-prometheus-stack` chart version: https://github.com/orgs/prometheus-community/packages/container/package/charts%2Fkube-prometheus-stack
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- HashiCorp tutorial on managing Kubernetes custom resources with `kubernetes_manifest`: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider

## Issues Found
- The post pinned `kube-prometheus-stack` to chart version `56.6.2`, which was outdated by the review date. I updated it to `83.6.0`, the latest official published chart version available on 2026-04-24.
- The Grafana persistence block used `storageClass`, but the chart values use `storageClassName`. I corrected the field so the persistence settings match the chart schema.
- The Alertmanager route used `match`, which the official Alertmanager configuration reference marks as deprecated in favor of `matchers`. I replaced it with a `matchers` list.
- The PagerDuty receiver used `{{ .Labels.severity }}`, but Alertmanager receiver templates are evaluated against notification `Data`, which exposes `CommonLabels` at the top level. I changed it to `{{ .CommonLabels.severity }}`.
- Step 2 implied that a `PrometheusRule` managed by `kubernetes_manifest` could be created in the same initial apply as the Helm chart. HashiCorp documents that CRDs must already exist before Terraform/OpenTofu can plan a custom resource, so I updated the instructions to make Step 2 a second apply after Step 1 and removed the misleading `depends_on` line.
- The standalone Grafana admin Secret resource was unused and could fail because it targeted the `monitoring` namespace before the Helm release created that namespace. I removed the unused resource and kept the generated password wired to the Grafana value actually consumed by the chart.

## Review Notes
- The chart repository URL used in the post is still valid, although the project now also publishes the chart as an OCI artifact.
- The example still stores generated credentials in OpenTofu/Terraform state because the password is passed through provider-managed configuration.
