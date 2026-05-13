# Validation Summary: Calico Observability: enable-visual-dashboards-calico-networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- FelixConfiguration
- Prometheus
- PrometheusRule
- Grafana
- Fluent Bit
- Loki
- Elasticsearch

## Sources Consulted
- Calico Open Source documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation: Felix Configuration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Monitoring Felix with Prometheus, https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source documentation: Enable the flow logs API and Calico Whisker, https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source documentation: Visualizing metrics via Grafana, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-visual
- Calico Enterprise documentation: Configure Prometheus, https://docs.tigera.io/calico-enterprise/latest/operations/monitor/prometheus/configure-prometheus
- Calico Cloud documentation: Felix Configuration resource, https://docs.tigera.io/calico-cloud/reference/resources/felixconfig

## Issues Found
- The policy deny-rate alert used `rate(felix_int_dataplane_failures[5m]) > 0`, but Calico documents `felix_int_dataplane_failures` as dataplane update failures that will be retried, not policy denies. Changed the alert expression to `rate(calico_denied_packets[5m]) > 0`, matching Calico Enterprise policy metric documentation for denied packets.
- The post presented `flowLogsFlushInterval` and `flowLogsFileEnabled` as generic Calico flow-log settings. These file-based FelixConfiguration fields are documented for Calico Cloud/Enterprise, while current Calico Open Source flow-log viewing uses Goldmane and Whisker. Clarified the introduction and command comment to distinguish Calico Open Source from Calico Cloud/Enterprise file-based flow logs.

## Review Notes
- The Felix metrics command and port are consistent with Calico documentation: Felix metrics are disabled by default and use port 9091 when enabled.
- The PrometheusRule manifest uses a valid Prometheus Operator API shape, but real deployments may need namespace and label values that match the installed Prometheus rule selectors.
