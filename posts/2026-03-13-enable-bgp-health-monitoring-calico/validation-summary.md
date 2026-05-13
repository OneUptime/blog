# Validation Summary: Calico Observability: enable-bgp-health-monitoring-calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico Enterprise and Calico Cloud
- Kubernetes
- FelixConfiguration
- Calico Felix Prometheus metrics
- Calico flow logs, Goldmane, and Whisker
- calicoctl
- Prometheus Operator PrometheusRule
- Grafana, Fluent Bit, Loki, and Elasticsearch

## Sources Consulted
- Calico Open Source documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Enable the flow logs API and Calico Whisker - https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source documentation: View flow logs in the Calico Whisker web console - https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Cloud documentation: FelixConfiguration flow log fields - https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: calicoctl node command requirements - https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Prometheus Operator API reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1

## Issues Found
- The introduction treated file-based flow logs as a generic Calico Open Source FelixConfiguration capability. I clarified that Calico Open Source uses Goldmane/Whisker for flow logs, while file-based reports apply to Calico Enterprise and Calico Cloud.
- The flow log patch did not state its product scope. I changed the command comment to identify it as a Calico Enterprise or Calico Cloud file-based flow log configuration.
- The `calicoctl node status` example omitted the host-side execution requirement. I updated the comment and command to match the official documentation example using `sudo calicoctl node status` on a host running `calico-node`.
- The alert named `CalicoHighDenyRate` used `felix_int_dataplane_failures`, which measures dataplane failures rather than policy denies. I renamed the alert and summary to describe dataplane failures accurately.
- The conclusion described "high policy deny rate" as if it came from the Felix dataplane failure metric. I changed it to "flow-log deny trends" so the signal matches the documented flow log data.

## Review Notes
The PrometheusRule shape is valid for Prometheus Operator, but the `up{job="calico-node-metrics"}` expression depends on the local Prometheus scrape job label. Operators may need to adjust that label to match their ServiceMonitor or scrape configuration.
