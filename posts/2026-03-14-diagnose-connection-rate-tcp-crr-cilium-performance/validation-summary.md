# Validation Summary: Diagnosing Connection Rate (TCP_CRR) Issues in Cilium Performance

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Hubble
- eBPF/BPF maps
- Linux TCP networking
- netperf TCP_CRR
- bpftool

## Sources Consulted
- Cilium command cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg bpf nat list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_metrics_list/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_monitor/
- Cilium `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium eBPF maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Hubble JSON export/filter example: https://docs.cilium.io/en/latest/observability/hubble/configuration/export/

## Issues Found
- The post used `cilium bpf`, `cilium metrics`, `cilium monitor`, and `cilium endpoint` commands for agent-local diagnostics. Current Cilium documentation exposes these through `cilium-dbg`, so the commands were updated to use `sudo cilium-dbg`.
- The prerequisites omitted `hubble` and `cilium-dbg`, both required by the examples. They were added.
- The conntrack explanation said each TCP_CRR transaction creates and destroys a conntrack entry. This was too immediate and was changed to say entries are later removed by Cilium conntrack garbage collection or timeout handling.
- The Hubble JSON example used `.l4.TCP...` directly, but Hubble JSON output wraps flow data under `.flow`. The command was updated to filter SYN packets with `--tcp-flags syn` and read verdict fields from `.flow`.
- The NAT section implied all connection-rate growth appears in the NAT table. This was narrowed to masqueraded connections, matching Cilium NAT map behavior.
- The verification section said the direct pod versus ClusterIP difference shows NAT overhead. This was changed to service load-balancing and reverse-NAT overhead, which is more accurate for Cilium service traffic.
- The NAT port exhaustion advice suggested reducing `tcp_fin_timeout`, which is not the right primary Cilium diagnostic. It now points to `nat_endpoint_max_connection`, ephemeral port usage, and NAT map capacity only when the map is constrained.
- The L7 policy troubleshooting note described per-connection Envoy setup. This was changed to Envoy proxying overhead.
- The host-to-host baseline used a host-network client but did not start a host-network netperf server on the target node. The example now starts `host-netperf-server`, reads its host IP, and targets that IP.

## Review Notes
The commands that inspect BPF maps are node-local. In a multi-node cluster, run the `cilium-dbg` commands on the relevant node or in the relevant Cilium agent pod for the traffic path being tested.
