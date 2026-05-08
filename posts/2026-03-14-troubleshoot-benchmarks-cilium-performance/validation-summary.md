# Validation Summary: Troubleshooting Benchmarks in Cilium Performance

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- iperf3
- netperf
- Linux networking and MTU diagnostics
- eBPF/bpftool
- Prometheus and Grafana

## Sources Consulted
- Cilium command reference for `cilium config set`: https://docs.cilium.io/en/latest/cmdref/cilium_config_set.html
- Cilium Policy Audit Mode documentation: https://docs.cilium.io/en/latest/security/policy-creation/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium troubleshooting documentation for `cilium-dbg status` and endpoint diagnostics: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium sysdump` and `cilium-bugtool` command references: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/ and https://docs.cilium.io/en/stable/cmdref/cilium-bugtool/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#top
- iperf3 FAQ from ESnet: https://software.es.net/iperf/faq.html
- netserver man page: https://manpages.debian.org/unstable/netperf/netserver.1.en.html
- iputils `ping` man page: https://www.mankier.com/8/ping

## Issues Found
- The post stated that the iperf3 server is single-threaded. This is outdated for iperf3 3.16 and later, where iperf3 supports one thread per stream. Updated the text to scope the limitation to iperf3 versions before 3.16 and added an `iperf3 -v` check.
- The netperf file descriptor check used `kubectl exec netperf-server -- ulimit -n`, but `ulimit` is a shell builtin. Changed it to `kubectl exec netperf-server -- sh -c 'ulimit -n'`.
- The Policy Audit Mode example used `enabled` and `disabled` values. Cilium documents this ConfigMap setting as boolean `true` and `false`, so the commands were updated accordingly.
- The troubleshooting bullet showed an invalid `kubectl exec -- ping` command without a pod name or destination. Replaced it with `kubectl exec test-pod -- ping $SERVER_IP`.
- The emergency diagnostics script used current-cluster `cilium` commands for datapath debug subcommands that are now documented under `cilium-dbg` inside the agent context. Updated connection tracking and metrics collection to use `kubectl exec -n kube-system ds/cilium -- cilium-dbg ...`.

## Review Notes
- `networkstatic/iperf3` is commonly used in examples, but the post does not pin an image digest or version. For reproducible benchmark work, pinning benchmark tool versions would be better.
- The Cilium CLI also provides `cilium sysdump`, while `cilium-bugtool` remains documented for agent/system bug reports. The escalation guidance is acceptable, but `cilium sysdump` may be more convenient for Kubernetes clusters.
