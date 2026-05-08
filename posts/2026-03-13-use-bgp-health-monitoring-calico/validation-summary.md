# Validation Summary: Calico Observability: use-bgp-health-monitoring-calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- FelixConfiguration
- Goldmane and Whisker flow logs
- Prometheus and PrometheusRule
- Grafana
- calicoctl

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico monitoring Felix with Prometheus reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico monitor component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico flow logs API and Whisker guide: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico kube-controllers Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post used `flowLogsFlushInterval` and `flowLogsFileEnabled` as a generic Calico Open Source flow log setup. Those file reporter fields are not present in the current Calico Open Source FelixConfiguration reference; current Calico Open Source flow logs are enabled with Goldmane and Whisker resources for operator or Helm installs. I replaced the command with `Goldmane` and `Whisker` manifests and updated the architecture diagram accordingly.
- The alert named `CalicoHighDenyRate` used `felix_int_dataplane_failures`, which is documented as dataplane update failures, not policy deny rate. I renamed the alert and summary to describe dataplane failures accurately.
- The conclusion described policy deny rate as one of the alert signals in the post, but the included Prometheus rule did not measure policy denies. I updated the conclusion to match the documented metrics covered by the guide: dataplane failures, metrics availability, and IPAM utilization from kube-controllers metrics.

## Review Notes
Calico Open Source flow logs via Goldmane and Whisker are documented as a tech preview feature in current Calico documentation. File-based flow log export and dedicated policy deny metrics are available in Calico Cloud or Enterprise contexts, but they should be called out explicitly if covered in a future version of this post.
