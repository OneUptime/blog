# Validation Summary: Troubleshooting Request/Response Rate (TCP_RR) in Cilium Performance

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF and bpftool
- Hubble
- netperf TCP_RR
- Linux perf, ethtool, and netstat

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Cilium CLI and cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium kube-proxy replacement validation examples using cilium-dbg status: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free.html
- Cilium Policy Audit Mode documentation: https://docs.cilium.io/en/latest/security/policy-creation/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium performance benchmarking documentation: https://docs.cilium.io/en/latest/operations/performance/benchmark/
- Cilium connectivity perf command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_perf/
- bpftool-prog manual page: https://www.mankier.com/8/bpftool-prog
- Netperf manual: https://hewlettpackard.github.io/netperf/doc/netperf.html
- Local tool help for perf, ethtool, and netstat command syntax.

## Issues Found
- The same-node `kubectl run --overrides` example had invalid shell quoting and the override snippets omitted `apiVersion`, which the kubectl reference documents for inline JSON overrides. I corrected the JSON and introduced `SERVER_NODE` to keep the command readable.
- The `kubectl run` examples passed container commands after `--` without `--command`, which would be treated as container args rather than an explicit command. I added `--command --` to the netserver and netperf invocations.
- The post used Kubernetes-facing `cilium` CLI commands for node-local datapath operations such as `monitor`, `endpoint`, `bpf ct`, and `identity`. Current Cilium docs expose those through `cilium-dbg`, so I changed the examples to run `cilium-dbg` via `kubectl -n kube-system exec ds/cilium --`.
- The bpftool statistics example assumed `run_cnt` and `run_time_ns` are always populated. bpftool documents that these require BPF program statistics to be enabled, so I added a note about `kernel.bpf_stats_enabled`.
- The fixed `avg_ns > 2000` threshold was not supported by the docs and is workload/kernel dependent. I changed it to recommend investigating outliers relative to the rest of the programs.
- The conntrack flush command used the old `cilium bpf ct flush global` form. I updated it to the documented `cilium-dbg bpf ct flush` form.
- The policy audit commands used `policy-audit-mode enabled/disabled`. Cilium documents boolean daemon audit mode and per-endpoint `PolicyAuditMode=Enabled/Disabled`; I changed the guide to use the per-endpoint `cilium-dbg endpoint config` flow so it can be temporary without a DaemonSet restart.
- The Hubble drop command used `--type drop`; Cilium Hubble docs show filtering dropped traffic with `--verdict DROPPED`, so I corrected the command.

## Review Notes
Cilium's built-in `cilium connectivity perf` can run same-node, other-node, host-network, and RR performance tests with Cilium-maintained images. The manual netperf workflow remains useful for troubleshooting, but future revisions could mention `cilium connectivity perf` as a safer baseline path.
