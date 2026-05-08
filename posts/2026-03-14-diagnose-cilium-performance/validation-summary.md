# Validation Summary: How to Diagnose Performance Issues in Cilium

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- eBPF and BPF maps
- Hubble
- Kubernetes
- Prometheus metrics
- iperf3
- bpftool

## Sources Consulted
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium command reference for `cilium-dbg bpf nat list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list/
- Cilium command reference for `cilium-dbg status`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Kubernetes configuration documentation for monitor aggregation: https://docs.cilium.io/en/latest/network/kubernetes/configuration/
- Cilium performance tuning guide for Hubble overhead and monitor aggregation: https://docs.cilium.io/en/latest/operations/performance/tuning/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- bpftool program command reference: https://manpages.ubuntu.com/manpages/jammy/man8/bpftool-prog.8.html

## Issues Found
- The post used `cilium bpf ...`, `cilium config`, `cilium endpoint`, and `cilium status` inside Cilium pods. Current Cilium documentation identifies `cilium-dbg` as the local agent debug CLI, so these commands were updated to `cilium-dbg` equivalents.
- The post listed `cilium bpf prog list`, which is not a current Cilium debug command. It was replaced with `bpftool prog show | grep -E "cil_|cilium" -A2` to inspect loaded BPF program sizes.
- The post referenced `cilium_policy_evaluation_duration`, which is not a documented Cilium metric. It was changed to documented policy implementation/update metrics, including `cilium_policy_implementation_delay` and `cilium_policy_incremental_update_duration`.
- The post described iperf3 `--bidir` as a TCP_RR latency equivalent. iperf3 bidirectional mode is a bidirectional throughput test, so the comment and pod name were corrected.
- The Hubble metrics example scraped port `9962` and searched for Cilium event/perf-event metrics. Hubble metrics are exposed under the `hubble_` namespace on the Hubble metrics port, commonly `9965`, so the example now checks `hubble_flows_processed_total` and `hubble_lost_events_total` on port `9965`.
- Troubleshooting commands for encryption and routing mode were updated to use `cilium-dbg` through `kubectl exec`.

## Review Notes
The benchmarking examples use placeholder node names (`node-1`, `node-2`) for cross-node testing; readers must replace those with real Kubernetes node names. Hubble metrics must also be enabled for the `hubble_` metric checks to return data.
