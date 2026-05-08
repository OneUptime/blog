# Validation Summary: Troubleshooting Cilium Performance and Scalability

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Cilium CLI and cilium-dbg
- Kubernetes
- Hubble
- eBPF/BPF maps
- Prometheus metrics
- iperf3 and netperf

## Sources Consulted
- Cilium command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium command reference for `cilium-dbg bpf nat list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list/
- Cilium command reference for `cilium-dbg identity list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium eBPF maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium identity-relevant labels scalability documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium bugtool command reference: https://docs.cilium.io/en/stable/cmdref/cilium-bugtool/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post used agent-local commands such as `cilium bpf ct list`, `cilium bpf nat list`, `cilium identity list`, `cilium metrics list`, and `cilium monitor`. Current Cilium documentation exposes these local agent inspection commands through `cilium-dbg`, so the examples now run `cilium-dbg` inside the Cilium DaemonSet with `kubectl exec`.
- The BPF map section said it checked all BPF map sizes, but the commands only counted CT and NAT map entries. The comment now accurately says the commands check CT and NAT BPF map entry counts.
- The OOMKilled check used `kubectl get events --field-selector reason=OOMKilled`, but `OOMKilled` is a container termination reason rather than a reliable Kubernetes Event reason selector. The example now checks Cilium pod container statuses for `OOMKilled` and `CrashLoopBackOff`.
- The Hubble drop example used `hubble observe --type drop`. The Hubble examples in Cilium documentation use verdict filtering for dropped flows, so it now uses `hubble observe --verdict DROPPED --last 50`.
- The emergency diagnostics script used a local `cilium`/`cilium-dbg` invocation for agent-local state. The CT and metrics collection examples now execute `cilium-dbg` through the Cilium DaemonSet.
- The prerequisites omitted tools used later in the guide. Added `hubble`, `jq`, and `bpftool` to the prerequisite tooling list.

## Review Notes
The guide is technically relevant and broadly accurate after the command corrections. The hard thresholds such as `>80%` map utilization and `>50000` identities are operational heuristics rather than Cilium-enforced limits; future revisions could make that caveat explicit.
