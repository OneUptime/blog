# Validation Summary: Calico Observability: alert-dropped-traffic-auditing-calico

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
- Flow logs
- calicoctl

## Sources Consulted
- Calico Open Source FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source flow logs and Whisker documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Open Source flow logs enablement documentation: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Cloud FelixConfiguration flow log file settings: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico kube-controllers Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The alert named `CalicoHighDenyRate` used `rate(felix_int_dataplane_failures[5m]) > 0`, but the Calico Felix metrics reference defines `felix_int_dataplane_failures` as data plane update failures, not policy deny events. Renamed the alert to `CalicoDataplaneFailures` and updated its summary.
- The flow-log command used `flowLogsFlushInterval` and `flowLogsFileEnabled` without qualifying the product scope. Current Calico Open Source documentation exposes flow logs through Goldmane/Whisker, while file-based flow log Felix settings are documented for Calico Cloud/Enterprise. Added wording to clarify that distinction and relabeled the command.
- The conclusion described "high policy deny rate" as if it were provided by the Felix dataplane failure metric. Updated the wording to refer to denied flow volume from flow logs and IPAM utilization from kube-controllers metrics.

## Review Notes
The PrometheusRule example is syntactically consistent with Prometheus Operator rules, but the `up{job="calico-node-metrics"}` selector depends on the local Prometheus scrape job naming. Calico's Open Source documentation examples use a service named `felix-metrics-svc`, so production deployments should align this selector with their actual ServiceMonitor or scrape configuration.
