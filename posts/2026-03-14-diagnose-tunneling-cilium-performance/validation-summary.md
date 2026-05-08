# Validation Summary: Diagnosing Tunneling Performance Issues in Cilium

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- VXLAN
- Geneve
- Native routing
- Hubble
- eBPF/BPF tooling
- tcpdump, iperf3, bpftool, and bpftrace

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium System Requirements documentation: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium config` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg bpf nat list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Linux kernel XDP redirect tracing documentation: https://docs.kernel.org/next/bpf/redirect.html

## Issues Found
- The post used `cilium status --verbose` and searched for `DatapathMode`, but current Cilium agent status exposes routing details through fields such as `Routing` and `Host Routing`. I changed those examples to run `cilium-dbg status --verbose` inside a Cilium DaemonSet pod and grep for routing fields.
- The post checked `cilium config view | grep tunnel`, which can miss current configuration keys. I changed it to check `routing-mode`, `tunnel-protocol`, and `tunnel-port`.
- The post used `cilium bpf ...` and `cilium endpoint ...` for local agent/BPF state. Current Cilium docs distinguish the Kubernetes-facing `cilium` CLI from the per-agent `cilium-dbg` CLI, so I changed those examples to execute `cilium-dbg` inside the Cilium DaemonSet.
- The MTU inspection command only checked `cilium_vxlan`. I updated it to check `cilium_vxlan` or `cilium_geneve`, matching the two tunnel protocols discussed.
- The real-time monitor examples used `cilium monitor`; current command references document this as `cilium-dbg monitor`. I updated the command text and examples.
- The Hubble JSON examples referenced fields such as `.verdict` and `.source` at the top level. Hubble JSON output wraps flow data under `.flow`, so I updated the `jq` filters accordingly.
- The `bpftool`/`jq` example assumed all programs have `name`, `run_cnt`, and `run_time_ns` fields. I made the filter tolerant of missing values.
- The `bpftrace` example referenced `args->action` for `tracepoint:xdp:xdp_redirect`, which does not match the documented XDP tracepoint examples. I replaced it with the documented pattern for counting XDP tracepoints by probe name.

## Review Notes
The general explanation of Cilium encapsulation mode, VXLAN/Geneve UDP ports, VXLAN MTU overhead, native routing tradeoffs, Hubble usage, and sysdump/diagnostic collection is consistent with current Cilium documentation. The performance impact percentage remains workload-dependent and should be treated as a rough observation rather than a guaranteed value.
