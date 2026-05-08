# Validation Summary: Diagnosing Single-Stream Performance Issues in Cilium

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Linux traffic control and BPF tooling
- iperf3
- bpftool
- ethtool
- Linux IRQ/RPS networking

## Sources Consulted
- Cilium command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg bpf policy get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium `cilium encryption status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status.html
- Cilium eBPF datapath introduction: https://docs.cilium.io/en/stable/network/ebpf/intro/
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium eBPF maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps/
- Cilium Bandwidth Manager documentation: https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/
- Kubernetes `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- bpftool program documentation: https://www.mankier.com/8/bpftool-prog
- eBPF `BPF_ENABLE_STATS` documentation: https://docs.ebpf.io/linux/syscall/BPF_ENABLE_STATS/

## Issues Found
- The post used `cilium bpf ...`, `cilium endpoint ...`, and `cilium monitor` as if they were external Cilium CLI commands. Current Cilium documentation exposes those low-level daemon commands through `cilium-dbg`, usually run inside a Cilium agent pod. Updated those examples to use `kubectl -n kube-system exec ds/cilium -- cilium-dbg ...`.
- The post used `cilium encrypt status`, but the Kubernetes-facing Cilium CLI command is `cilium encryption status`. Updated the command.
- The L7 proxy JSON query used `.[].policy.proxy-statistics`, which is not valid jq syntax for a hyphenated field and did not match the documented endpoint JSON shape. Updated it to `.[].status.policy."proxy-statistics" // empty`.
- The bpftool runtime-statistics example assumed `run_time_ns` and `run_cnt` are always populated. Added `kernel.bpf_stats_enabled=1` before sampling and reset it after, consistent with bpftool/kernel behavior.
- The verification section used Cilium metrics as a CPU utilization source. Replaced it with `kubectl top pod -n kube-system -l k8s-app=cilium --containers`, which is the Kubernetes command for pod/container CPU and memory usage.
- The L7 policy explanation said Cilium performs per-packet L7 parsing in eBPF. Updated it to state that matching L7 traffic is redirected through Envoy proxy processing, which is the relevant overhead.
- The "eBPF Metrics" heading overstated what the commands collected. Renamed it to "eBPF State" and adjusted the introductory sentence to distinguish map/program state from metrics.

## Review Notes
The post remains a practical diagnostic guide rather than a guaranteed benchmark procedure. Some threshold guidance, such as treating a 10-15% gap or 1-2 microseconds per BPF invocation as suspicious, is workload- and hardware-dependent but reasonable as heuristic troubleshooting guidance.
