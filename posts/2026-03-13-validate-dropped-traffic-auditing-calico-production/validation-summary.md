# Validation Summary: Calico Observability: validate-dropped-traffic-auditing-calico-production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- FelixConfiguration
- Prometheus
- Prometheus Operator PrometheusRule
- Grafana
- Fluent Bit
- Loki / Elasticsearch
- Calico flow logs
- Calico IPAM

## Sources Consulted
- Calico Open Source FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source flow logs documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Open Source calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Open Source kube-controllers Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico Enterprise policy metrics documentation: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics
- Calico Cloud Prometheus alerting documentation: https://docs.tigera.io/calico-cloud/operations/monitor/prometheus/configure-prometheus

## Issues Found
- The `CalicoHighDenyRate` alert used `felix_int_dataplane_failures`, but Calico documents that metric as dataplane update failures that will be retried, not policy deny events. Changed the deny-rate alert to use `calico_denied_packets`, the documented Calico Enterprise/Cloud policy metric for denied packets.
- Added a separate `CalicoDataplaneFailures` alert for `felix_int_dataplane_failures` so dataplane programming failures remain monitored with the correct meaning.
- The Felix metrics-down alert assumed only `job="calico-node-metrics"`. Calico Open Source examples commonly use `felix_metrics`, while Calico Enterprise/Cloud examples use `calico-node-metrics`, so the expression now matches either job label.
- The metrics inspection command assumed the operator install namespace `calico-system`. Calico manifest installs commonly use `kube-system`, so the example now sets `CALICO_NAMESPACE` and notes the alternate namespace.
- The alert configuration did not state that `calico_denied_packets` is a Calico Enterprise/Cloud policy metric. Added a sentence clarifying that Open Source-only clusters should alert from flow logs instead.
- The conclusion described dataplane failures specifically as iptables programming errors. Calico also supports non-iptables dataplanes, and the official metric definition is broader, so the wording now says dataplane programming errors that will be retried.
- The conclusion implied policy deny rate comes from Felix dataplane failure metrics. Updated it to distinguish denied traffic from flow logs or policy metrics, and IPAM utilization from kube-controllers metrics.

## Review Notes
- The `flowLogsFileEnabled` and `flowLogsFlushInterval` FelixConfiguration fields are valid in current Calico documentation. Calico Open Source flow logs are currently documented as tech preview, so production users should check release notes before relying on the exact flow-log behavior.
- `calico_denied_packets` is a Calico Enterprise/Cloud policy metric, not a Felix core metric exposed by the basic Open Source Felix metrics endpoint.
