# Validation Summary: How to Set Up Prometheus Federation Across Multiple Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus federation
- Prometheus configuration, recording rules, alerting rules, and PromQL
- Kubernetes Deployments, Services, Ingress, Secrets, and kubectl port-forward
- Prometheus Operator PrometheusRule custom resources
- Istio ServiceEntry
- Grafana dashboard queries

## Sources Consulted
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line flag reference: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus installation documentation: https://prometheus.io/docs/prometheus/latest/installation/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus basic auth guide: https://prometheus.io/docs/guides/basic-auth/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Prometheus GitHub releases: https://github.com/prometheus/prometheus/releases

## Issues Found
- The deployment example used `prom/prometheus:v2.45.0`, which is outdated relative to the current Prometheus 3.x releases. Updated it to `prom/prometheus:v3.12.0`, the current release shown in the official Prometheus GitHub releases during review.
- The deployment used the deprecated `--storage.tsdb.retention.time` command-line flag. Moved the retention setting into the Prometheus configuration under `storage.tsdb.retention.time`, as documented by the current Prometheus configuration reference.
- The central Prometheus Deployment used `replicas: 2` while mounting a single TSDB volume. Changed it to `replicas: 1` to avoid an unsafe shared local TSDB example.
- The `/federate` match parameter was described as filtering which metrics are exposed. Clarified that it filters which metrics are returned for a given request or scrape configuration.
- The Ingress text said it exposes only `/federate` publicly. Clarified that it routes the `/federate` path and still needs authentication or network restrictions before external exposure.
- The basic auth section implied that scrape-client `basic_auth` config enables basic authentication on Prometheus itself. Reworded it to say that the source endpoint must already be protected and that the federation Prometheus is configured to send credentials.
- The `ClusterHighMemory` alert referenced `global_cluster:container_memory_working_set_bytes:sum`, but the global recording rules did not define that series. Added the missing memory-by-cluster recording rule.
- The federation health examples used `prometheus_target_scrapes_total` and `prometheus_target_interval_length_seconds`, which are not the right general-purpose per-job scrape health signals. Replaced them with `avg_over_time(up{job=~"federate-.*"}[5m])`, `scrape_duration_seconds`, and `scrape_samples_post_metric_relabeling`.

## Review Notes
The Prometheus and Kubernetes snippets were reviewed against official documentation for current API fields and configuration structure. `promtool` and `kubectl` were not installed in the local environment, so command-line validation could not be executed locally.
