# Validation Summary: Diagnosing Multi-Stream Performance Issues in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Hubble
- eBPF and BPF maps
- iperf3
- Linux networking tools: ethtool, perf, mpstat, numactl, lspci

## Sources Consulted
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium Hubble observe documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium cilium-dbg monitor reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium cilium-dbg BPF CT list reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium performance tuning guide: https://docs.cilium.io/en/stable/operations/performance/tuning.html
- Cilium eBPF maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps/
- Cilium BPF architecture reference: https://docs.cilium.io/en/stable/reference-guides/bpf/architecture/
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Local bpftool help output for `bpftool map`

## Issues Found
- The iperf3 server example did not wait for the server pod before reading the pod IP and starting clients. Added `kubectl wait --for=condition=Ready` so the benchmark is less likely to race pod startup.
- The client benchmark used `--rm -it` inside a loop, which can fail or produce awkward behavior in non-interactive environments. Changed it to `--rm --attach=true --restart=Never`, matching kubectl's run/attach behavior while preserving output collection.
- The post stated that any non-linear multi-stream throughput scaling indicates a bottleneck. This was too absolute because throughput cannot scale linearly indefinitely. Reworded it to focus on early plateaus or drops.
- The NIC queue tuning command used `ethtool -L eth0 combined $(nproc)`, which can exceed the NIC driver's supported maximum. Replaced it with a placeholder tied to the maximum reported by `ethtool -l`.
- The BPF section said Cilium's BPF maps are shared across all CPUs. This was imprecise because Cilium and the kernel support per-CPU and non-per-CPU map types. Reworded it around node-scoped datapath maps and non-per-CPU backend contention.
- The `bpftool map show` comment claimed to show operation counts and timing, but the command only reports map metadata such as type, limits, and entries. Updated the comment to match the command.
- The Cilium debug examples used `cilium bpf ct list global` and `cilium monitor`. Current Cilium documentation exposes these node/agent diagnostics through `cilium-dbg`, so the commands were changed to `cilium-dbg bpf ct list` and `cilium-dbg monitor --type drop -v`.
- The prerequisites did not list `hubble` or `cilium-dbg`, even though the workflow uses both. Updated the prerequisites to include them.
- The Hubble JSON `jq` filter assumed flow fields were always top-level. Hubble JSON examples may be wrapped under `.flow`, so the filter now supports both `(.flow // .)` forms.
- The BPF map contention remediation suggested "increase per-CPU map usage" without naming the Cilium-supported setting. Updated it to reference Cilium's distributed per-CPU LRU map backend and map sizing.

## Review Notes
The diagnostic workflow is technically relevant and broadly accurate after the fixes. Several commands remain intentionally environment-dependent, including interface name `eth0`, NIC queue statistic names, NUMA layout, and whether XDP acceleration is appropriate for a given deployment. Those are acceptable caveats for this type of operational guide.
