# Validation Summary: How to Monitor Calico eBPF Troubleshooting

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico eBPF dataplane
- Felix Prometheus metrics
- Prometheus alerting rules and PromQL
- Prometheus Operator `PrometheusRule`
- Alertmanager webhook receivers
- kube-state-metrics pod restart metrics
- Bash automation

## Sources Consulted
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico eBPF dataplane enablement documentation: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico source for BPF endpoint metrics: https://github.com/projectcalico/calico/blob/master/felix/dataplane/linux/bpf_ep_mgr.go
- Calico source for BPF IP set metrics: https://github.com/projectcalico/calico/blob/master/felix/bpf/ipsets/ipsets.go
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- Alertmanager webhook receiver configuration: https://prometheus.io/docs/alerting/latest/configuration/#webhook_config
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
1. The alert example used `felix_bpf_enabled`, but Calico's current Felix metrics reference does not document a boolean eBPF-enabled metric. I changed the alert to use documented Felix metrics, comparing `felix_active_local_endpoints` with `felix_bpf_happy_dataplane_endpoints` to detect nodes with local endpoints but no successfully programmed BPF endpoints.
2. The map exhaustion alert used `felix_bpf_conntrack_entries` and `felix_bpf_conntrack_max_entries`, which are not documented Felix metrics. I replaced that alert with `felix_bpf_dirty_dataplane_endpoints > 0`, a documented BPF dataplane metric that identifies endpoint programming failures.
3. The dashboard and conclusion referenced BPF map fill levels and map exhaustion as if Felix exposed conntrack/NAT/route-table capacity metrics. I updated those references to documented BPF endpoint and IP set health metrics.
4. The webhook shell script comment implied Alertmanager directly executes the script. Alertmanager sends an HTTP POST to a webhook URL, so I clarified that the script is example handler logic run by the service receiving the webhook.

## Review Notes
The PrometheusRule structure, Alertmanager `webhook_configs` fields, Prometheus alert templating variables, and `kube_pod_container_status_restarts_total` usage are consistent with the consulted documentation. `promtool` and Ruby were not installed in the local environment, so validation relied on documentation/source review and manual YAML inspection.
