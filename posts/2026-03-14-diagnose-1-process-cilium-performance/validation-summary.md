# Validation Summary: Diagnosing Single-Process Performance Bottlenecks in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Hubble
- Linux eBPF
- Linux CPU scheduling and softirq processing
- Linux cgroups
- perf, bpftool, taskset, mpstat, pidstat, ethtool, crictl

## Sources Consulted
- Cilium command reference for `cilium status`, `cilium config`, and `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg bpf nat list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_nat_list/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli.html
- Cilium troubleshooting documentation for Hubble and `cilium-dbg`: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Linux kernel cgroup v2 documentation for `cpu.stat`: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Linux kernel CFS bandwidth control documentation for cgroup v1 CPU throttling fields: https://docs.kernel.org/scheduler/sched-bwc.html
- eBPF documentation for `BPF_ENABLE_STATS` and BPF runtime counters: https://docs.ebpf.io/linux/syscall/BPF_ENABLE_STATS/
- Linux manual pages for `taskset` and `perf record`: https://man7.org/linux/man-pages/man1/taskset.1.html and https://man7.org/linux/man-pages/man1/perf-record.1.html
- Local CLI help for `bpftool prog`, `perf record`, `taskset`, and `ethtool`.

## Issues Found
- The original PID discovery command read `/proc/1/status` inside the container, which returns a PID in the container PID namespace, not the host PID needed by node-level `taskset`, `perf`, and `pidstat`. Replaced it with Kubernetes node/container ID lookup plus `crictl inspect` on the node.
- The introduction overstated that all packet processing is always funneled through one CPU core and included an unsupported 30-50% throughput-loss figure. Reworded it to describe concentration on a small number of cores for busy flows and removed the precise percentage claim.
- The BPF runtime counter example assumed `run_cnt` and `run_time_ns` are always present. Added the requirement to enable BPF runtime statistics and made the `jq` expression tolerate missing fields.
- The cgroup CPU throttling command used only the cgroup v1 path and only the v1 `throttled_time` field. Updated it to check cgroup v2 first and document the cgroup v2 `throttled_usec` field.
- The Hubble drop command used `--type drop`, which is not the documented way to filter dropped flows. Replaced it with `--verdict DROPPED`, and normalized the protocol filter to lowercase `tcp`.
- The IRQ affinity example wrote hexadecimal masks to `smp_affinity` while describing CPU numbers. Changed it to use `smp_affinity_list` with CPU list values.
- The diagnostic collection section used node-local Cilium datapath commands through `cilium`, but current Cilium documentation exposes those commands under `cilium-dbg` inside the agent pod. Updated the BPF map and endpoint collection commands accordingly.
- The troubleshooting note referenced `cilium monitor`; updated it to `cilium-dbg monitor` inside the Cilium agent pod.

## Review Notes
The guide is technically relevant and useful, but several diagnostics still depend on cluster/container-runtime details such as namespace, container index, runtime socket access, and NIC naming. Those are reasonable operational caveats for this type of troubleshooting guide.
