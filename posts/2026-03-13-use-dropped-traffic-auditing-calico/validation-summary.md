# Validation Summary: Calico Observability: use-dropped-traffic-auditing-calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico Cloud
- Calico Enterprise
- Kubernetes
- FelixConfiguration
- Prometheus and PrometheusRule
- Grafana
- Fluent Bit
- Loki / Elasticsearch
- calicoctl

## Sources Consulted
- Calico Open Source FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source flow logs / Goldmane and Whisker documentation: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Cloud FelixConfiguration reference for file-based flow logs: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post implied that file-based flow log settings apply to all Calico installations. Current Calico Open Source documentation enables flow logs through Goldmane and Whisker, while `flowLogsFileEnabled` and `flowLogsFlushInterval` are documented in Calico Cloud/Enterprise FelixConfiguration references. I changed the introduction and command comment to make the product scope explicit.
- The `CalicoHighDenyRate` alert used `felix_int_dataplane_failures`, which Calico documents as dataplane update failures, not policy denies. I renamed the alert and summary to describe dataplane failures accurately.
- The conclusion described Felix dataplane failures specifically as iptables programming errors. Calico also has other dataplanes, so I changed this to dataplane programming errors.
- The conclusion described high policy deny rate as an operational signal without clarifying its source. I updated it to say this signal comes from flow logs, not the Felix dataplane failure metric.
- The metrics example hard-coded the `calico-system` namespace, which is correct for operator installs but not all manifest installs. I updated it to discover the namespace for the `calico-node` pod.
- Calico documents `calicoctl node status` as a command run directly on a node and examples use `sudo`. I updated the example command accordingly.

## Review Notes
The metrics command, Felix metrics port, `calicoctl node status`, and PrometheusRule structure are consistent with the referenced documentation. The post would be stronger in the future if it included separate Open Source Goldmane/Whisker commands and Calico Cloud/Enterprise file-log commands, but I did not add new sections because the review requested only targeted technical corrections.
