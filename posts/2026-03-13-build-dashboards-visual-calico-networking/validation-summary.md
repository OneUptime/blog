# Validation Summary: Calico Observability: build-dashboards-visual-calico-networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico Cloud/Enterprise
- Kubernetes
- FelixConfiguration
- Prometheus and PrometheusRule
- Grafana
- Fluent Bit
- Loki / Elasticsearch
- calicoctl

## Sources Consulted
- Calico Open Source FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Open Source kube-controllers Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico Cloud FelixConfiguration resource reference: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Cloud recommended Prometheus metrics: https://docs.tigera.io/calico-cloud/operations/monitor/metrics/recommended-metrics
- Calico Enterprise recommended Prometheus metrics: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics

## Issues Found
- The post presented flow logs as a general Calico capability. File flow-log FelixConfiguration fields such as `flowLogsFlushInterval` and `flowLogsFileEnabled` are documented for Calico Cloud/Enterprise, so the introduction, command comment, and conclusion now make that edition boundary explicit.
- The `CalicoHighDenyRate` alert used `felix_int_dataplane_failures`, which measures failed data plane updates that Felix will retry, not policy denies. The alert expression now uses `rate(calico_denied_packets[5m]) > 0`, matching the Calico Cloud/Enterprise policy metrics documentation.
- The conclusion described Felix dataplane failures as iptables programming errors. The official Felix metrics reference defines `felix_int_dataplane_failures` more generally as data plane update failures that will be retried, so the wording was corrected.

## Review Notes
The IPAM utilization recommendation is valid, but in Calico Open Source it comes from kube-controllers metrics such as `ipam_allocations_in_use` and `ipam_ippool_size` on port 9094, not from the Felix port 9091 endpoint shown in the quick check command. Future improvements could include a separate kube-controllers scrape example.
