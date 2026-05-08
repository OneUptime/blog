# Validation Summary: Calico Observability: use-visual-dashboards-calico-networking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico Enterprise and Calico Cloud flow log options
- Kubernetes
- FelixConfiguration
- Goldmane and Whisker
- Prometheus and PrometheusRule
- Grafana
- calicoctl
- kubectl

## Sources Consulted
- Calico Open Source component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source flow log enablement documentation: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source flow log viewing documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Cloud FelixConfiguration resource reference for file-based flow log fields: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Enterprise policy metrics documentation: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics
- Calico kube-controllers Prometheus metric reference: https://docs.tigera.io/calico-cloud/reference/component-resources/kube-controllers/prometheus
- Calico calicoctl node status command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post used `flowLogsFileEnabled` and `flowLogsFlushInterval` as the generic way to enable Calico flow logs. Those file-based fields are documented for Calico Cloud and Enterprise, while current Calico Open Source enables flow logs through the Goldmane and Whisker operator resources. I replaced the command with the documented `Goldmane` and `Whisker` resources.
- The observability diagram implied all flow logs go through Fluent Bit to Loki or Elasticsearch. I updated the labels to include the Open Source Goldmane/Whisker path while preserving file log pipelines as an option for environments that support them.
- The `CalicoHighDenyRate` alert queried `felix_int_dataplane_failures`, which is a Felix dataplane failure metric, not a policy deny-rate metric. I renamed the alert and summary to describe dataplane failures accurately.
- The conclusion treated high policy deny rate as if it came from the same Felix metric used in the alert example. I clarified that deny activity should come from flow logs or Calico Enterprise policy metrics, while IPAM utilization comes from kube-controllers metrics.

## Review Notes
- The Felix metrics enablement command, port 9091 reference, `calicoctl node status` command, and PrometheusRule resource shape are consistent with official documentation.
- Prometheus job labels such as `calico-node-metrics` depend on the local ServiceMonitor or scrape configuration, so operators may need to adjust the `up{job="calico-node-metrics"}` selector for their monitoring stack.
