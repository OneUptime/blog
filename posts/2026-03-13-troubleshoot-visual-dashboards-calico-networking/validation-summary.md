# Validation Summary: Calico Observability: troubleshoot-visual-dashboards-calico-networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico FelixConfiguration
- Kubernetes
- Prometheus
- PrometheusRule
- Grafana
- Goldmane
- Whisker
- calicoctl

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico monitor component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico enable flow logs documentation: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico view flow logs documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico-enterprise/latest/reference/component-resources/node/felix/prometheus
- Calico calicoctl node command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post used `flowLogsFlushInterval` and `flowLogsFileEnabled` as generic Calico Open Source FelixConfiguration fields. Current Calico Open Source documentation does not list those fields in the FelixConfiguration reference; Open Source flow logs are enabled through Goldmane and Whisker for operator or Helm installs. I changed the flow-log command to apply `Goldmane` and `Whisker` resources and updated the architecture diagram accordingly.
- The `CalicoHighDenyRate` alert queried `felix_int_dataplane_failures`, which is a dataplane failure signal, not a policy deny-rate metric. I renamed the alert to `CalicoDataplaneFailures` and changed the summary to match the metric.
- The conclusion treated high policy deny rate as directly covered by the shown Felix alert. I changed it to recommend Whisker/Goldmane flow logs or Calico Cloud/Enterprise policy metrics for deny-rate monitoring.

## Review Notes
The examples assume an operator or Helm Calico installation using the `calico-system` namespace. Manifest-based installations commonly use `kube-system`, and Open Source flow logs through Goldmane/Whisker are not supported for manifest installs.
