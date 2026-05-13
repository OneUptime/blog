# Validation Summary: Calico Observability: enable-policy-troubleshooting-calico-logs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Calico Cloud flow logs
- Kubernetes
- Prometheus
- Prometheus Operator PrometheusRule
- Grafana
- Fluent Bit
- Loki
- Elasticsearch

## Sources Consulted
- Calico Open Source: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Cloud: FelixConfiguration resource, flow log settings - https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Cloud: Policy metrics - https://docs.tigera.io/calico-cloud/operations/monitor/metrics/policy-metrics
- Calico Cloud: kube-controllers Prometheus metrics for IPAM - https://docs.tigera.io/calico-cloud/reference/component-resources/kube-controllers/prometheus
- Prometheus Operator API reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post described flow logs as a general Calico capability, but the referenced `flowLogsFlushInterval` and `flowLogsFileEnabled` FelixConfiguration fields are documented in Calico Cloud. Updated the introduction, command comment, and conclusion to identify flow logs as Calico Cloud functionality.
- The `CalicoHighDenyRate` alert used `felix_int_dataplane_failures`, which measures dataplane update failures rather than policy deny rate. Renamed the alert to `CalicoDataplaneFailures` and updated the summary to match the metric.
- The conclusion implied `felix_int_dataplane_failures` indicated only iptables programming errors. Updated the wording to dataplane programming errors so it remains accurate across supported Calico dataplanes.
- The conclusion said to configure alerts for all three signals even though policy deny rate depends on policy metrics and flow-log/policy features that are edition-specific. Updated the wording to recommend alerts for signals relevant to the Calico edition in use.

## Review Notes
The Felix metrics enablement command, default metrics port 9091, `calicoctl node status`, PrometheusRule API version/kind, and `felix_int_dataplane_failures` metric name were consistent with official documentation. The direct `kubectl exec` metrics check is operationally reasonable for a calico-node pod, but production Prometheus scraping normally uses a Service or ServiceMonitor.
