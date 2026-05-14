# Validation Summary: Calico Observability: build-dashboards-dropped-traffic-auditing-calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Felix Prometheus metrics
- Calico flow logs, Goldmane, and Whisker
- Prometheus and PrometheusRule resources
- Grafana dashboards
- calicoctl

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Felix Prometheus metric reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source flow logs enablement guide: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico flow logs overview: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico kube-controllers Prometheus metric reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post enabled flow logs by patching `FelixConfiguration` with `flowLogsFlushInterval` and `flowLogsFileEnabled`. Current Calico Open Source documentation enables flow logs through the operator-managed `Goldmane` and `Whisker` custom resources, so the command was replaced with the documented `kubectl apply` example.
- The architecture diagram showed flow logs going through Fluent Bit to Loki or Elasticsearch and then Grafana. That does not match the current Calico Open Source flow-log path, so it was updated to show flow logs flowing through Goldmane to Whisker while metrics flow through Prometheus to Grafana.
- The alert named `CalicoHighDenyRate` used `felix_int_dataplane_failures`, which measures failed dataplane updates that Felix will retry, not policy denies. The alert name and summary were changed to describe dataplane failures accurately.
- The conclusion described `felix_int_dataplane_failures` as specifically indicating iptables programming errors. The metric is broader than iptables and applies to dataplane update failures, so the wording was generalized.
- The conclusion implied policy deny rate was available from the shown Felix metric. It now refers to denied traffic in flow logs or policy metrics, which matches Calico documentation.

## Review Notes
The PrometheusRule snippet assumes the Prometheus Operator CRDs are installed and that a scrape job named `calico-node-metrics` exists. The Calico metrics command assumes an operator-style installation in the `calico-system` namespace; manifest-based installations may use `kube-system` instead.
