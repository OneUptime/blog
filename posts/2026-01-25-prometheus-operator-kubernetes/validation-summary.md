# Validation Summary: How to Use Prometheus Operator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus Operator
- Kubernetes custom resources and manifests
- kube-prometheus-stack Helm chart
- ServiceMonitor
- PodMonitor
- PrometheusRule
- AlertmanagerConfig
- ScrapeConfig
- Helm
- kubectl

## Sources Consulted
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator ScrapeConfig documentation: https://prometheus-operator.dev/docs/developer/scrapeconfig/
- Prometheus Operator admission webhook documentation: https://prometheus-operator.dev/docs/platform/webhook/
- kube-prometheus-stack values.yaml: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Community Helm charts repository documentation: https://prometheus-community.github.io/helm-charts/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The PodMonitor example claimed to scrape only running pods, but the relabeling did not drop pods in the `Unknown` phase. Updated the regex to `Pending|Succeeded|Failed|Unknown` so only `Running` pods remain.
- The automated monitoring example alerted on `up{job="my-application"}`, but a ServiceMonitor without `jobLabel` defaults the `job` label to the ServiceMonitor namespace/name. Added `jobLabel: app` so the generated `job` label matches the alert expression.
- The best-practices section recommended `promtool check rules prometheusrule.yaml` for a full Kubernetes `PrometheusRule` resource. `promtool check rules` validates native Prometheus rule files, not CRD-wrapped resources. Replaced it with `kubectl apply --dry-run=server -f prometheusrule.yaml` and updated the wording.

## Review Notes
- The ScrapeConfig CRD is still documented as alpha in the Prometheus Operator API reference, so teams should verify their installed operator and CRD versions before relying on it in production.
- Local `helm`, `kubectl`, and `promtool` binaries were not available in this workspace, so command behavior was verified against official documentation rather than executed locally.
