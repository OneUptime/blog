# Validation Summary: How to Deploy Prometheus and Grafana with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform-style HCL
- Kubernetes
- Helm
- Prometheus
- Alertmanager
- Grafana
- kube-prometheus-stack
- PrometheusRule custom alerting rules

## Sources Consulted
- Prometheus Community Helm charts index: https://prometheus-community.github.io/helm-charts/index.yaml
- kube-prometheus-stack chart values for `84.0.0`: https://raw.githubusercontent.com/prometheus-community/helm-charts/kube-prometheus-stack-84.0.0/charts/kube-prometheus-stack/values.yaml
- kube-prometheus-stack template for additional Prometheus rules: https://raw.githubusercontent.com/prometheus-community/helm-charts/kube-prometheus-stack-84.0.0/charts/kube-prometheus-stack/templates/prometheus/additionalPrometheusRules.yaml
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Grafana Helm chart values: https://raw.githubusercontent.com/grafana/helm-charts/main/charts/grafana/values.yaml
- HashiCorp tutorial on managing Kubernetes custom resources with `kubernetes_manifest`: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider

## Issues Found
- The post pinned `kube-prometheus-stack` to `55.5.0`, which was far behind the current official chart release on April 24, 2026. Updated the example to `84.0.0` after checking the Prometheus Community chart index.
- The Alertmanager child route used the deprecated `match` field. Replaced it with `matchers = ["severity=\"critical\""]` to align with the current Alertmanager configuration reference.
- The Grafana ingress example used the legacy `kubernetes.io/ingress.class` annotation. Replaced it with `ingressClassName = "nginx"`, which is what the chart values and Kubernetes ingress guidance recommend for modern clusters.
- The Grafana example set `adminPassword` directly in Helm values while the post’s own best-practices section says to use Secrets. Replaced that with `grafana.admin.existingSecret` and documented the expected secret keys.
- The standalone `kubernetes_manifest` example for `PrometheusRule` was problematic for two reasons: the Kubernetes provider requires CRDs to exist before planning custom resources, and the labels shown would not match the chart’s default Prometheus rule selector. Replaced the example with the chart-native `additionalPrometheusRulesMap` configuration, which avoids the CRD planning issue and uses the chart’s generated labels correctly.

## Review Notes
- The updated Grafana example assumes a `grafana-admin` Secret already exists in the `monitoring` namespace with `admin-user` and `admin-password` keys.
- The sample alert rule assumes your workloads expose an `http_requests_total` metric with a `status` label.
