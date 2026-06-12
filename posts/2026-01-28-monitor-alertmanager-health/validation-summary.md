# Validation Summary: How to Monitor Alertmanager Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus Alertmanager
- Prometheus scrape configuration and PromQL
- Prometheus alerting rules
- Prometheus Operator ServiceMonitor
- Kubernetes liveness and readiness probes
- Grafana dashboards
- Alertmanager HTTP and API v2 endpoints

## Sources Consulted
- Prometheus Alertmanager overview: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager management API: https://prometheus.io/docs/alerting/latest/management_api/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Operator API reference for ServiceMonitor and Endpoint: https://prometheus-operator.dev/docs/api-reference/api/
- Alertmanager API v2 OpenAPI specification: https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
- Alertmanager source metrics definitions: https://github.com/prometheus/alertmanager

## Issues Found
- The cluster health examples used `alertmanager_cluster_peers_joined_total - alertmanager_cluster_peers_left_total` as a current peer-health query. Those are lifetime counters, not a direct current health check. I changed the example to count alive peers with `alertmanager_cluster_peer_info{state="alive"}`.
- The post referenced `alertmanager_cluster_messages_publish_failures_total`, which is not a current Alertmanager metric. I replaced it with `alertmanager_cluster_failed_peers`, which is documented by Alertmanager's high-availability documentation and implemented in the current source.
- The "cluster lost quorum" wording was inaccurate because Alertmanager HA is gossip-based rather than quorum-based. I changed the alert summary and description to describe too few members for high availability and deduplication.
- The dead man's switch route used the deprecated `match` route field. I changed it to the current `matchers` syntax.

## Review Notes
The notification failure queries are technically valid, but current Alertmanager includes a `reason` label on `alertmanager_notifications_failed_total`; aggregating by `integration` intentionally collapses that label. The example alert for `AlertmanagerNotReceivingAlerts` is environment-dependent: it can be noisy in quiet systems where no alerts are expected in a 10-minute window.
