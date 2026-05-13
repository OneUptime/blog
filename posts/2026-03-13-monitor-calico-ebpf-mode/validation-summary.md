# Validation Summary: How to Monitor Calico eBPF Mode

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico eBPF data plane
- Calico Felix Prometheus metrics
- Kubernetes custom resources and Services
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Grafana dashboard planning
- Bash and kubectl

## Sources Consulted
- Calico documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Enabling the eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Troubleshoot eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post referenced Felix metric names that are not listed in the current Calico Felix Prometheus metric reference: `felix_bpf_enabled`, `felix_bpf_map_size_used`, `felix_bpf_map_size_capacity`, `felix_bpf_prog_execution_failures_total`, `felix_bpf_nat_entries`, and `felix_bpf_conntrack_entries`. Replaced them with documented BPF metrics: `felix_bpf_dataplane_endpoints`, `felix_bpf_happy_dataplane_endpoints`, `felix_bpf_dirty_dataplane_endpoints`, `felix_bpf_num_ip_sets`, and `felix_bpf_conntrack_maglev_entries_total`.
- The ServiceMonitor example selected `k8s-app: calico-node` directly, but ServiceMonitor selectors match Services, and the endpoint `port` refers to the Service port name. Added a headless `Service` for Felix metrics with a named `metrics` port and updated the ServiceMonitor selector to match that Service.
- The alert examples used undocumented metrics for eBPF active status, map capacity, and program execution failures. Replaced them with alerts for missing BPF metrics, BPF endpoints that are not fully programmed, and dirty BPF endpoints.
- The dashboard layout and conclusion referred to BPF map utilization, program error rates, and `felix_bpf_enabled`. Updated those references to match the documented Felix BPF metrics.

## Review Notes
Calico's documentation notes that Felix metrics can change because some metrics are tied to implementation details. Future reviews should re-check the current Felix Prometheus metric reference for the specific Calico version targeted by the post.
