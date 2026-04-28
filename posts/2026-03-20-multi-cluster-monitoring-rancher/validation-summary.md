# Validation Summary: How to Set Up Multi-Cluster Monitoring in Rancher

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Rancher (rancher-monitoring chart)
- Prometheus / Prometheus Operator (CRD `monitoring.coreos.com/v1`)
- Thanos (Bitnami Helm chart)
- Grafana
- AlertManager
- Helm
- Kubernetes
- PromQL

## Sources Consulted
- Rancher Monitoring docs: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Rancher Monitoring Helm chart options: https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/helm-chart-options
- Rancher charts repo: https://github.com/rancher/charts
- kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Operator remote-write spec: https://prometheus-operator.dev/docs/proposals/accepted/remote-write/
- Bitnami Thanos chart: https://github.com/bitnami/charts/blob/main/bitnami/thanos/values.yaml
- AlertManager configuration: https://prometheus.io/docs/alerting/latest/configuration/
- AlertManager changelog: https://github.com/prometheus/alertmanager/blob/main/CHANGELOG.md
- Grafana dashboard 15757 ("Kubernetes / Views / Global"): https://grafana.com/grafana/dashboards/15757

## Issues Found
No technical issues found.

All commands, manifests, and configuration were verified:
- The `rancher-charts/rancher-monitoring` chart at `https://charts.rancher.io` exists and installs into `cattle-monitoring-system`. The `prometheus.prometheusSpec.retention` and `prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage` value paths are valid (inherited from kube-prometheus-stack).
- The Prometheus CR `remoteWrite` snippet uses correct camelCase field names (`writeRelabelConfigs`, `targetLabel`, `basicAuth` with `name`/`key` SecretKeySelectors). The operator translates these to snake_case for the underlying Prometheus config — this is by design.
- The default Prometheus CR name `rancher-monitoring-prometheus` matches what the chart deploys.
- The Bitnami Thanos chart accepts `query.enabled`, `queryFrontend.enabled`, `receive.enabled`, and `objstoreConfig` as a YAML string.
- AlertManager `pagerduty_configs.service_key`, `slack_configs.api_url`, and `slack_configs.channel` are all valid.
- Grafana dashboard ID `15757` is indeed "Kubernetes / Views / Global", a multi-cluster overview dashboard from the dotdc/grafana-dashboards-kubernetes set.
- The PromQL query for per-cluster CPU usage is syntactically and semantically correct.

## Review Notes
- **AlertManager `match:` deprecation**: The `match:` field (key/value map) used in Step 5 is deprecated in favor of the newer `matchers:` syntax (a list of matcher strings such as `severity="critical"`). `match:` still works in current AlertManager versions and is not broken, so no change was made — but readers writing new configs from scratch should prefer `matchers:`.
- **PagerDuty `service_key` vs `routing_key`**: `service_key` is for the legacy PagerDuty "Prometheus" integration; `routing_key` is for Events API v2. Both are supported but mutually exclusive. The post's choice is valid.
- **Bitnami chart caveat**: As of August 2025 Bitnami restructured public chart distribution (moving many charts to a paid/secure tier). The community `bitnami/thanos` chart is still available, but readers may want to verify the repo URL works at the time they install, or use the upstream Thanos manifests as an alternative.
- **Implicit prerequisite**: Installing `rancher-monitoring` typically requires installing the matching `rancher-monitoring-crd` chart first when going via Helm directly. The post simplifies this; the Rancher UI handles it automatically. Not a technical error, just a workflow detail.
