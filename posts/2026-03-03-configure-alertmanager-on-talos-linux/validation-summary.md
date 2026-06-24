# Validation Summary: How to Configure Alertmanager on Talos Linux

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Prometheus Alertmanager
- Talos Linux (Kubernetes)
- kube-prometheus-stack / prometheus-community Helm charts
- prometheus-operator PrometheusRule CRD (monitoring.coreos.com/v1)
- Alertmanager API v2

## Sources Consulted
- Prometheus Alertmanager configuration docs — https://prometheus.io/docs/alerting/latest/configuration/ (verified pagerduty_configs `service_key` vs `routing_key` mutual exclusivity, slack_configs `api_url`/`channel`, webhook_configs `max_alerts`, deprecation of `match`/`match_re` in favor of `matchers`)
- prometheus-community alertmanager Helm chart values — https://github.com/prometheus-community/helm-charts/blob/main/charts/alertmanager/values.yaml (verified `persistence.enabled`, `persistence.size`, `service.type`, and `service.nodePort` override)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- All receiver configurations are valid: `slack_configs` (`api_url`, `channel`, `send_resolved`, `title`, `text`, `color`, `actions`), `email_configs` (`smarthost`, `auth_username`, `auth_password`, `headers`), `pagerduty_configs` (`service_key` — valid for the PagerDuty "Prometheus" integration type, with `severity`/`description`/`details`), and `webhook_configs` (`url`, `send_resolved`, `max_alerts`).
- The route tree fields (`receiver`, `group_by`, `group_wait`, `group_interval`, `repeat_interval`, `routes`, `continue`) and `inhibit_rules` (`source_match`, `target_match`, `target_match_re`, `equal`) are valid.
- `match` and `match_re` (used throughout the post) are officially DEPRECATED in favor of the `matchers` list, but they remain functional in current Alertmanager. Left as-is since the examples still work; readers on the latest Alertmanager may prefer `matchers`.
- The Helm install command is valid: `persistence.enabled`, `persistence.size`, `service.type`, and `service.nodePort` are all settable values (nodePort is an override that requires `service.type=NodePort`, which the command sets).
- PrometheusRule example uses valid CRD apiVersion `monitoring.coreos.com/v1` and real kube-state-metrics / node-exporter metrics (`kube_node_status_condition`, `node_cpu_seconds_total`, `node_memory_MemAvailable_bytes`, `kube_pod_container_status_restarts_total`, `kube_pod_status_ready`).
- Alertmanager API v2 endpoints (`/api/v2/silences`, `/api/v2/alerts`) and `amtool check-config` are correct. The exec example's config path `/etc/alertmanager/config/alertmanager.yaml` is the raw secret mount; on prometheus-operator-managed Alertmanager the rendered config is typically under `/etc/alertmanager/config_out/`. This is version/deployment dependent and was left as illustrative.
- Talos-specific notes (Alertmanager runs as an in-cluster workload with persistent storage; nodes have no host-level mail tools) are accurate for Talos's immutable/minimal design.
