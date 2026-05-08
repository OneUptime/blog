# Validation Summary: Calico Observability: validate-bgp-health-monitoring-calico-production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Felix Prometheus metrics
- Calico flow logs, Goldmane, and Whisker
- Prometheus Operator PrometheusRule
- Grafana
- BGP monitoring with calicoctl

## Sources Consulted
- Calico Open Source documentation: FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source documentation: Enable the flow logs API and Calico Whisker: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source documentation: calicoctl node status: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Prometheus Operator API reference: PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The flow-log enablement command patched Felix file-reporting fields, which is not the documented Calico Open Source flow-log enablement workflow. Replaced it with the documented `Goldmane` and `Whisker` custom resources.
- The observability architecture showed flow logs going through Fluent Bit to Loki or Elasticsearch, which did not match the corrected Calico Open Source flow-log path. Updated it to show flow logs through Goldmane and Whisker / the flow logs API.
- The alert named `CalicoHighDenyRate` queried `felix_int_dataplane_failures`, which is a Felix dataplane failure counter rather than a policy deny-rate metric. Renamed the alert and summary to match the metric.
- The conclusion described high policy deny rate as one of the three primary alert signals in this post, but the included metrics-backed alert was for dataplane failures. Updated the conclusion to align with the corrected alert examples.

## Review Notes
Calico Open Source flow logs through Goldmane and Whisker are documented as a tech preview feature in the current Calico documentation. The Prometheus `up{job="calico-node-metrics"}` alert assumes the Prometheus scrape job uses that exact job label; operators may need to adjust the label selector to match their Prometheus configuration.
