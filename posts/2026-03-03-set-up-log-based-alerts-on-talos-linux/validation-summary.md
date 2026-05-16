# Validation Summary: How to Set Up Log-Based Alerts on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Helm
- Grafana Loki
- Loki Ruler
- LogQL
- Promtail
- Grafana data source provisioning
- Alertmanager

## Sources Consulted
- Grafana Loki Helm installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki monolithic Helm chart documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Loki Helm chart values reference: https://grafana.com/docs/loki/latest/setup/install/helm/reference/
- Grafana Loki alerting and recording rules documentation: https://grafana.com/docs/loki/latest/alert/
- Grafana Loki metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Promtail Helm chart values: https://raw.githubusercontent.com/grafana/helm-charts/main/charts/promtail/values.yaml
- Grafana Promtail configuration and scraping documentation: https://grafana.com/docs/loki/latest/send-data/promtail/configuration/ and https://grafana.com/docs/loki/latest/send-data/promtail/scraping/
- Grafana Promtail CRI stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/cri/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The Loki Helm chart repository and deployment mode were outdated. Updated the Loki install to use the Grafana Community chart repository and `deploymentMode: Monolithic`, matching current Loki Helm documentation.
- The Loki values snippet mixed top-level chart values with internal Loki configuration keys. Moved ruler and retention settings under `loki.rulerConfig` and `loki.limits_config`, added a TSDB schema configuration, and kept the top-level `ruler.enabled` chart value.
- The single-binary example did not zero out the other deployment mode replica counts. Added the replica overrides recommended by the Loki monolithic Helm documentation.
- The Promtail client and Grafana data source pointed at `loki.logging.svc.cluster.local:3100`, which does not match the default Loki Helm gateway service. Updated both to use `loki-gateway.logging.svc.cluster.local`.
- The Promtail values used `config.scrapeConfigs`, which the Promtail chart would ignore. Moved the custom scrape config under `config.snippets.scrapeConfigs`.
- The Promtail scrape config omitted the `__path__` relabel rules required to read Kubernetes pod log files from `/var/log/pods`. Added the standard path relabeling rules from the chart defaults.
- `labeldrop` was incorrectly placed in Promtail pipeline stages. Moved it to `relabel_configs`, where `labeldrop` is valid.
- The Loki alert rules were shown as a standalone ConfigMap followed by `kubectl apply`, but that would not mount the rules into Loki. Changed the example to use the Loki Helm chart's `ruler.directories` values and `helm upgrade`.
- The Alertmanager route example used deprecated `match`. Updated it to current `matchers` syntax.
- Promtail is end-of-life as of March 2, 2026. Added a note that new deployments should use Grafana Alloy and that the Promtail example is for existing Promtail-based clusters.

## Review Notes
The LogQL alert expressions follow the documented log-range aggregation syntax. The Promtail section is technically corrected for legacy Promtail deployments, but future updates should replace Promtail with Grafana Alloy because Promtail is no longer a current collector for new deployments.
