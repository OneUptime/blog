# Validation Summary: Monitor Calico VPP Host Networking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico VPP
- Kubernetes
- VPP
- Prometheus
- Grafana
- DPDK
- ethtool

## Sources Consulted
- Calico VPP data plane implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP v3.32.0 Prometheus implementation: https://github.com/projectcalico/vpp-dataplane/blob/v3.32.0/calico-vpp-agent/prometheus/prometheus.go
- Calico VPP v3.32.0 Prometheus tests: https://github.com/projectcalico/vpp-dataplane/blob/v3.32.0/calico-vpp-agent/prometheus/prometheus_test.go
- Calico VPP v3.32.0 configuration source: https://github.com/projectcalico/vpp-dataplane/blob/v3.32.0/config/config.go
- Calico VPP v3.32.0 DaemonSet manifest: https://github.com/projectcalico/vpp-dataplane/blob/v3.32.0/yaml/base/calico-vpp-daemonset.yaml
- Prometheus Go metrics exporter sanitization source: https://github.com/orijtech/prometheus-go-metrics-exporter/blob/master/sanitize.go
- VPP basic interface command reference: https://docs.fd.io/vpp/22.10/cli-reference/interface/basic.html
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post described deploying a standalone `calicovpp/vpp-prometheus-exporter:latest` DaemonSet. I replaced this with the current Calico VPP built-in Prometheus endpoint, enabled through `CALICOVPP_FEATURE_GATES`, because the Calico VPP agent contains the Prometheus server and defaults to `:8888`.
- Several metric names were not exported by the Calico VPP Prometheus implementation, including `vpp_vector_rate`, `vpp_dpdk_rx_missed_errors`, `vpp_punt_rx`, `vpp_worker_wait`, `vpp_if_combined_*`, and `vpp_memory_free_bytes`. I replaced them with metrics exported by the Calico VPP agent, using the default sanitized `cni_projectcalico_vpp_` prefix, such as `cni_projectcalico_vpp_rx_packets`, `cni_projectcalico_vpp_tx_packets`, `cni_projectcalico_vpp_drops`, `cni_projectcalico_vpp_punt`, `cni_projectcalico_vpp_rx_miss`, and `cni_projectcalico_vpp_rx_no_buf`.
- The alert examples referenced incorrect metric and label names. I updated the PromQL to use Calico VPP metric names and the `vppInterfaceName` label used by the exporter.
- The dashboard examples used non-existent `vpp_if_combined_*` and vector-rate metrics. I updated them to use valid PromQL over the exported interface counters.
- The host NIC correlation text implied `ethtool` works generally for DPDK uplinks. I clarified that `ethtool` applies to kernel-visible interfaces, while DPDK-bound interfaces may disappear from Linux network devices.
- The conclusion still referenced deploying an exporter, vector rates, and hugepage utilization. I updated it to match the corrected Calico VPP monitoring path and exported metrics.

## Review Notes
`kubectl` is not installed in this local environment, so I could not run `kubectl patch --help`; the command syntax was reviewed against Kubernetes CLI conventions and the Calico VPP ConfigMap/environment configuration. The VPP CLI commands were checked against the official VPP interface command reference.
