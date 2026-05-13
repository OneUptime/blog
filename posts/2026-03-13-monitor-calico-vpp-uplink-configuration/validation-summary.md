# Validation Summary: Monitor Calico VPP Uplink Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes
- Prometheus Operator ServiceMonitor
- Prometheus alerting and PromQL
- Grafana dashboards
- VPP interface statistics
- DPDK device binding

## Sources Consulted
- Calico VPP data plane implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP Prometheus server source: https://github.com/projectcalico/vpp-dataplane/blob/v3.32.0/calico-vpp-agent/prometheus/prometheus.go
- Calico VPP metric descriptions source: https://github.com/projectcalico/vpp-dataplane/blob/v3.32.0/calico-vpp-agent/prometheus/stats_description.go
- Calico VPP Prometheus configuration defaults: https://github.com/projectcalico/vpp-dataplane/blob/v3.32.0/config/config.go
- VPP statistics documentation: https://docs.fd.io/vpp/23.06/developer/corefeatures/stats.html
- Prometheus Operator API reference for ServiceMonitor: https://prometheus-operator.dev/docs/api-reference/api/
- DPDK dpdk-devbind utility source and usage text: https://github.com/DPDK/dpdk/blob/main/usertools/dpdk-devbind.py

## Issues Found
- The post used non-existent metric names such as `vpp_dpdk_rx_missed_errors`, `vpp_dpdk_rx_errors`, `vpp_dpdk_link_status_changes`, and `vpp_dpdk_queue_fill_ratio`. I replaced them with Calico VPP exporter metrics derived from VPP interface stats, including `cni_projectcalico_vpp_rx_packets`, `cni_projectcalico_vpp_rx_bytes`, `cni_projectcalico_vpp_rx_miss`, `cni_projectcalico_vpp_rx_error`, and `cni_projectcalico_vpp_rx_no_buf`.
- The PromQL examples used an `interface` label, but the Calico VPP exporter uses `vppInterfaceName` for the VPP interface label. I updated alert and dashboard queries accordingly.
- The capacity alert referenced `vpp_interface_max_bandwidth`, which is not emitted by the Calico VPP exporter. I changed the example to use an explicit 10 Gbps denominator that users can adjust for their NIC.
- The post described link flapping and DPDK driver resets as metrics available from the VPP exporter. I changed those references to driver binding checks and VPP interface error/miss counters because those are supported by the documented exporter path.
- The Grafana "queue utilization" example used an unsupported queue fill metric. I replaced it with queue pressure indicators based on RX misses and RX mbuf allocation failures.

## Review Notes
The ServiceMonitor structure is valid for Prometheus Operator, but users must ensure its selector and namespace selection match the Service exposing the VPP metrics endpoint. Calico VPP Prometheus metrics are feature-gated and the default listen endpoint is `:8888`; the post now states that Calico VPP metrics must be enabled or another VPP exporter must be deployed.
