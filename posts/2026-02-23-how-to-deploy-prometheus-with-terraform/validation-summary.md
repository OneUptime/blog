# Validation Summary: How to Deploy Prometheus with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Terraform `hashicorp/helm` provider (v2.x)
- Terraform `hashicorp/kubernetes` provider (v2.x)
- Helm
- Prometheus
- kube-prometheus-stack Helm chart (v55.0.0)
- Prometheus Operator CRDs (ServiceMonitor, PrometheusRule)
- Alertmanager
- Grafana
- PromQL
- PagerDuty integration
- Kubernetes

## Sources Consulted
- Terraform Helm provider v2.x documentation: https://registry.terraform.io/providers/hashicorp/helm/2.17.0/docs
- Terraform Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Alertmanager configuration: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager matchers syntax: https://prometheus.io/docs/alerting/latest/configuration/#matcher
- PromQL functions (rate, histogram_quantile, humanizePercentage): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- PagerDuty receiver configuration: https://prometheus.io/docs/alerting/latest/configuration/#pagerduty_config

## Issues Found
No technical issues found.

## Review Notes
- The post pins `hashicorp/helm` to `~> 2.0`. The Helm provider v3.0 introduced breaking changes (the `kubernetes` block became an attribute with `=`, and `set` blocks became a list/object attribute). The code in this post is correct for the pinned v2.x range; if a reader upgrades to v3.x they will need to adjust the syntax.
- `kube-prometheus-stack` v55.0.0 is a real, released chart version but is from late 2023; newer chart versions are available by 2026. The configuration paths used (`prometheus.prometheusSpec.*`, `alertmanager.alertmanagerSpec.*`, `grafana.*`) remain stable across recent versions, so the example continues to work with newer chart releases.
- The `additionalScrapeConfigs` example targets `node-exporter.monitoring.svc.cluster.local:9100`. The kube-prometheus-stack chart already deploys its own node-exporter (typically under a service name like `<release>-prometheus-node-exporter`), so this scrape target is illustrative of how to add an external node-exporter rather than a target that would exist by default — the job is appropriately named `node-exporter-external` to convey this.
- The Alertmanager `matchers` field uses the newer matchers syntax (introduced in Alertmanager v0.22+) which supports unquoted simple values like `severity = critical`. This is valid; using quoted values (`severity = "critical"`) would also work and is sometimes preferred for clarity.
- The PagerDuty receiver uses `service_key`, which corresponds to the legacy Events API v1 integration. For Events API v2 integrations, `routing_key` is the equivalent field. Both are supported by Alertmanager.
- The `kubernetes_manifest` resource requires the Kubernetes cluster and CRDs (ServiceMonitor, PrometheusRule from monitoring.coreos.com/v1) to be reachable at plan time. The `depends_on = [helm_release.prometheus]` is necessary and correctly included so that the CRDs installed by the kube-prometheus-stack chart exist before the manifest resources are planned/applied.
