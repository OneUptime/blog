# Validation Summary: Diagnosing 32-Process Performance Bottlenecks in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF/BPF maps
- iperf3
- bpftool
- Linux performance tools: mpstat, perf, numastat, ethtool
- NUMA and NIC queue diagnostics

## Sources Consulted
- Cilium command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium eBPF maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps/
- Cilium command cheatsheet for `cilium-dbg` local agent commands: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium metrics documentation for BPF map operation metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- iperf3 manual: https://software.es.net/iperf/invoking.html
- bpftool program manual: https://man.archlinux.org/man/bpftool-prog.8.en

## Issues Found
- The post described the workload as 32 processes, but the iperf3 command uses `-P 32`, which creates parallel client streams, and iperf3 3.16+ uses one thread per stream. Changed the title, tags, description, headings, and explanatory text to use "32-stream" terminology.
- The verification loop used `kubectl exec iperf-client` after the earlier `kubectl run iperf-client --rm` command, which removes the pod when the test exits. Changed the loop to create a disposable iperf3 client pod for each stream count.
- The server pod IP was read immediately after `kubectl run`, which could race pod startup. Added `kubectl wait --for=condition=Ready` before reading `.status.podIP`.
- The CPU imbalance awk example only added user and system CPU time, omitting softirq and other non-idle time relevant to network datapath analysis. Changed it to calculate `100 - %idle` from mpstat's average output.
- The post used `cilium bpf ...` and `cilium endpoint ...` for local datapath inspection. Current Cilium documentation exposes these local agent operations through `cilium-dbg`, so the examples now run `cilium-dbg` inside a Cilium agent pod with `kubectl exec`.
- The bpftool/JQ expression assumed `run_time_ns` and `run_cnt` are always present and that every program has a name. bpftool only shows runtime counters when kernel BPF stats are enabled, so the example now guards for missing fields and says the counters depend on `kernel.bpf_stats_enabled`.
- The post stated that `avg_ns > 5000ns` suggests contention. That threshold is not documented as a Cilium or bpftool rule, so it was replaced with a safer comparison of before/during-load BPF execution cost.
- The NUMA troubleshooting bullet recommended pinning `cilium-agent` to the NIC NUMA node as a datapath fix. Cilium's fast path runs in kernel BPF programs, so the guidance now focuses on pinning the traffic generator and NIC IRQ/RPS CPUs; agent pinning is described as control-plane-only.

## Review Notes
The guide is technically relevant and useful after correction. Future improvements could add Cilium Prometheus queries for `bpf_map_ops_total` and node-specific selection of the Cilium agent pod on the client and server nodes.
