# Validation Summary: Monitor Calico VPP Technical Details

## Status
validated

## Post Type
Technical monitoring guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes
- FD.io VPP
- VPP stats socket / statseg
- VPP ACL plugin
- VPP DPDK plugin
- Prometheus
- Grafana
- Python vpp-papi

## Sources Consulted
- Calico VPP technical details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP troubleshooting: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- VPP statistics documentation and Python `VPPStats` example: https://s3-docs.fd.io/vpp/26.02/developer/corefeatures/stats.html
- VPP statseg configuration reference: https://docs.fd.io/vpp/25.06/configuration/reference.html
- VPP ACL plugin CLI reference: https://docs.fd.io/vpp/18.01.2/clicmd_src_plugins_acl.html
- VPP DPDK plugin CLI reference: https://s3-docs.fd.io/vpp/24.10/cli-reference/clis/clicmd_src_plugins_dpdk_device.html
- VPP hardware interface CLI reference: https://fd.io/docs/vpp/v2101/reference/cmdreference/interface/hardware
- VPP buffer CLI/source reference: https://docs.fd.io/vpp/20.09/d9/d0f/vlib_2buffer_8c.html
- VPP Prometheus exporter source: https://github.com/FDio/vpp/blob/master/src/vpp/app/vpp_prometheus_export.c
- VPP metric formatting source: https://github.com/FDio/vpp/blob/master/src/vpp/app/dump_metrics.c

## Issues Found
- The Python stats example called `s.ls('/if/')`, but VPP's documented `VPPStats.ls` examples pass a list of stat path patterns. Changed it to `s.ls(['^/if'])`.
- The buffer exhaustion diagram referenced `rx_no_bufs`, which is not the portable DPDK/VPP counter name documented for current VPP DPDK output. Changed the wording to buffer allocation or interface drop counters.
- The ACL section used `vppctl show acl-plugin statistics`, which is not a documented ACL plugin command. Replaced it with `show acl-plugin tables hash verbose` and `show acl-plugin memory`.
- The ACL section described non-documented `match_n_vectors_n` and `miss_n_vectors` metrics. Replaced those watch points with collision-chain and memory-consumption checks that match the corrected commands.
- The DPDK section used `vppctl show dpdk statistics`, which is not a documented current VPP DPDK CLI command. Replaced it with `show hardware-interfaces detail` for queue, descriptor, and extended interface counters, plus `show dpdk buffer` for DPDK mempool availability.
- The Prometheus examples used exporter-specific metric names such as `vpp_buffer_free_count`, `vpp_node_dpdk_input_no_buffers`, and `vpp_acl_hash_lookup_miss`. Updated the examples to match the VPP Prometheus exporter naming style for buffer pools, node counters, and `/err` counters.
- The guide referred to DPDK queue depth and ACL hash misses in places where the corrected commands expose interface counters, mempool state, ACL table state, and ACL memory usage instead. Updated those references to avoid overstating what VPP exposes directly.

## Review Notes
The exact Prometheus metric names depend on whether the VPP exporter is run in v1 or v2 formatting mode and which stat path patterns are exported. The corrected examples match the current VPP exporter v2 naming logic, but operators should still confirm names from the live `/metrics` endpoint before applying alerts.
