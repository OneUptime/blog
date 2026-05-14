# Validation Summary: How to Monitor Flagger Canary Progress with Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flagger
- Grafana
- Prometheus
- Prometheus Operator
- Kubernetes
- Helm
- Istio metrics
- PromQL

## Sources Consulted
- Flagger Monitoring documentation: https://docs.flagger.app/main/usage/monitoring
- Flagger Alerting documentation: https://docs.flagger.app/usage/alerting
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger GitHub repository and current source/docs: https://github.com/fluxcd/flagger
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Grafana Helm installation documentation: https://grafana.com/docs/grafana/latest/installation/helm/
- Grafana Community Helm chart README and values: https://github.com/grafana-community/helm-charts/tree/main/charts/grafana
- Grafana annotation documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/annotate-visualizations/
- Prometheus configuration documentation for Kubernetes service discovery and relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The Grafana Helm repository referenced the old `grafana.github.io/helm-charts` chart location and an outdated `7.x` chart range. Updated it to the current `grafana-community` Helm repository and a current `12.x` chart range.
- The Grafana data source URL used port `9090` while the post's verification command port-forwarded the Prometheus service from port `80`. Updated the in-cluster URL to the service DNS name without the incorrect port.
- The Grafana Helm values combined manual `dashboardProviders` with the dashboard sidecar. Removed the manual provider because the sidecar chart configuration provisions dashboard loading itself.
- The Prometheus scrape relabeling built an invalid target address from the port annotation alone. Updated the relabeling to use `__meta_kubernetes_pod_ip` and scrape Flagger on port `8080`.
- The listed Flagger metrics and status mapping were incorrect. Replaced the nonexistent or misdescribed metrics with the metrics documented by Flagger: `flagger_canary_status` as `0=running, 1=successful, 2=failed`, `flagger_canary_weight` keyed by `workload`, histogram duration metrics, metric analysis results, and success/failure counters.
- The dashboard JSON was wrapped in a top-level `dashboard` object, which is not the normal dashboard model consumed by file provisioning. Removed the wrapper so the dashboard fields are top-level.
- Several PromQL examples filtered `flagger_canary_weight` by `name`, but Flagger exposes the traffic weight metric with a `workload` label. Updated those queries.
- The primary workload comparison used `$canary-primary`, which Grafana would parse as a different variable name. Updated it to `${canary}-primary`.
- Deployment history incorrectly queried `flagger_canary_total` with a nonexistent `status` label. Updated it to use `increase()` over `flagger_canary_successes_total` and `flagger_canary_failures_total`.
- The alerting example was Grafana-labeled ConfigMap content in Prometheus rule syntax, which would not provision Grafana alerts. Replaced it with a Prometheus Operator `PrometheusRule` and corrected the failed-canary expression to `flagger_canary_status > 1`.
- The post described a Flagger `AlertProvider` of type `grafana`, but Flagger alert providers support chat integrations such as Slack, Microsoft Teams, Rocket.Chat, and Discord, not Grafana annotations. Replaced that section with Flagger's supported event webhook configuration for an annotation receiver.
- The reading guidance used the old detailed status mapping. Updated it to the documented Flagger status values.

## Review Notes
- The PrometheusRule example assumes Prometheus Operator or kube-prometheus-stack. Clusters using the standalone Prometheus Helm chart need to mount equivalent rule files through that chart's configuration instead.
- The Grafana annotation workflow still requires a receiver service that accepts Flagger event webhook payloads and writes annotations through Grafana's API.
