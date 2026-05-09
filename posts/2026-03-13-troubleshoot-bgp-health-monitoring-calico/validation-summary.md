# Validation Summary: Calico Observability: troubleshoot-bgp-health-monitoring-calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Felix Prometheus metrics
- Calico flow logs, Goldmane, and Whisker
- Prometheus and PrometheusRule
- Grafana
- Calico IPAM
- calicoctl
- BGP peering status

## Sources Consulted
- Calico documentation: Felix configuration, `prometheusMetricsEnabled` and `prometheusMetricsPort` - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus metric reference - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Enable the flow logs API and Calico Whisker - https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico documentation: `calicoctl node status` - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: Monitoring kube-controllers with Prometheus and IPAM metrics - https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Prometheus Operator API reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule

## Issues Found
- The flow logs command used `flowLogsFlushInterval` and `flowLogsFileEnabled`, which are not the current Calico Open Source flow-log enablement path. Replaced it with the documented `Goldmane` and `Whisker` custom resources.
- The observability architecture described flow logs going through Fluent Bit to Loki or Elasticsearch. Updated the diagram to match the current Calico Open Source flow logs API, Goldmane, and Whisker flow.
- The `CalicoHighDenyRate` alert queried `felix_int_dataplane_failures`, which measures dataplane update failures rather than policy denies. Renamed the alert and summary to describe dataplane failures accurately.
- The conclusion said to alert on three signals, including IPAM utilization, but the alert configuration did not include an IPAM utilization alert. Added a Prometheus expression using the documented `ipam_allocations_in_use` and `ipam_ippool_size` kube-controllers metrics.
- The conclusion described `felix_int_dataplane_failures` too narrowly as iptables programming errors. Updated it to match the official metric description: dataplane updates failed and will be retried.

## Review Notes
Calico flow logs through Goldmane and Whisker are documented as tech preview in current Calico Open Source documentation and require an operator or Helm installation. Manifest installations are not supported for that enablement path.
