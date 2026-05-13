# Validation Summary: Monitor Calico Host Endpoint Security

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico Open Source
- Calico Enterprise / Calico Cloud
- Kubernetes HostEndpoint
- FelixConfiguration
- Felix Prometheus metrics
- Prometheus Operator ServiceMonitor
- Grafana / Prometheus alert rules
- iptables counters

## Sources Consulted
- Calico Open Source Felix metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source HostEndpoint reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Cloud FelixConfiguration reference for flow log fields: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Cloud recommended policy metrics: https://docs.tigera.io/calico-cloud/operations/monitor/metrics/recommended-metrics
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post described Calico Open Source as exposing Felix metrics, flow logs, and policy audit logs. Current Calico documentation separates Open Source Felix metrics from Calico Enterprise and Calico Cloud flow-log and policy-metric features. I updated the introduction to make that product boundary explicit.
- The metrics table and diagram used undocumented Felix metric names: `felix_active_local_hostendpoints`, `felix_policy_dropped_packets_total`, `felix_policy_passed_packets_total`, and `felix_ipsets_calico`. I replaced them with documented metrics: `felix_cluster_num_host_endpoints`, `felix_active_local_endpoints`, `felix_int_dataplane_failures`, and `felix_resyncs_started`.
- The verification command grepped for `felix_host`, which is not a documented metric prefix in the current Felix metrics reference. I changed it to grep for `felix_active_local_endpoints`.
- The ServiceMonitor example selected `k8s-app: calico-node` but did not define a matching Kubernetes Service with a named metrics port. Since ServiceMonitor discovers Services, I added a headless `felix-metrics-svc` Service with a named `felix-metrics` port before the ServiceMonitor.
- The Grafana alert used the undocumented `felix_policy_dropped_packets_total` metric. I replaced the Open Source alert with one based on documented Felix data plane failures and added a separate Calico Enterprise / Calico Cloud example using the documented `calico_denied_packets` policy metric.
- The flow log command used a non-existent `flowLogsEnabled` FelixConfiguration field. I changed the section to configure the documented `flowLogsFlushInterval` field for Calico Enterprise / Calico Cloud instead of claiming a boolean enable switch.

## Review Notes
- The `kubectl patch felixconfiguration default --type=merge --patch '{"spec":{"prometheusMetricsEnabled":true,"prometheusMetricsPort":9091}}'` command is valid; Calico documents Felix metrics as disabled by default and port 9091 as the default metrics port.
- The `kubectl exec -n calico-system ds/calico-node -- curl ...` verification pattern is syntactically valid, but it assumes the `calico-node` container image has `curl` available. In environments where it does not, readers may need to port-forward the metrics Service or use another debug container.
- The iptables chain name shown for host endpoint forwarding counters is implementation-specific and can vary by dataplane mode. It is useful as an iptables dataplane troubleshooting hint, but it does not apply to eBPF or nftables dataplanes.
