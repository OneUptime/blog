# Validation Summary: Diagnosing Test Hardware Issues in Cilium Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium CLI
- Cilium agent debug CLI (`cilium-dbg`)
- Hubble
- Kubernetes and `kubectl`
- Linux hardware diagnostics (`ethtool`, `lscpu`, `numactl`, `lspci`)
- eBPF diagnostics (`bpftool`, `bpftrace`)

## Sources Consulted
- Cilium command reference: `cilium status` - https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference: `cilium config view` - https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Cilium command reference: `cilium-dbg` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium command reference: `cilium-dbg bpf ct list` - https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium command reference: `cilium-dbg endpoint list` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium command reference: `cilium-dbg monitor` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium troubleshooting guide - https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Hubble setup guide - https://docs.cilium.io/en/stable/observability/hubble/setup/
- Hubble project documentation and CLI examples - https://github.com/cilium/hubble
- Kubernetes `kubectl exec` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl logs` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Local `ethtool --help` output for `-i`, `-k`, `-l`, `-g`, and `-n rx-flow-hash` syntax.
- Local `bpftool prog help` output for `bpftool prog show --json` syntax.
- Local `lscpu --help` output for CPU and cache inspection options.

## Issues Found
- The post used `cilium bpf`, `cilium endpoint`, and `cilium monitor` for agent-local datapath diagnostics. Current Cilium documentation exposes those commands through `cilium-dbg`, so the examples now run `cilium-dbg` through a Cilium DaemonSet pod with `kubectl exec`.
- The monitor example used `jq '.[0].id'`, which emits a JSON string for string IDs and can pass quotes to `--related-to`. Changed it to `jq -r '.[0].id'`.
- The prerequisites omitted `hubble` and `jq`, both of which are used by later examples. Added them to the prerequisite list.
- The verification section said all items should show `PASS`, but `cilium status --verbose` reports Cilium component health rather than a PASS checklist. Updated the wording to expect OK/ready component status.
- The `bpftool`/`jq` example assumed every program object has `name`, `run_cnt`, and `run_time_ns`. Updated the filter and calculations to tolerate missing fields, which is important on systems where BPF stats are unavailable or not enabled.

## Review Notes
- The hardware diagnostic commands are syntactically valid, but several of them are hardware-driver dependent and may report "operation not supported" on virtual NICs or limited cloud instances.
- `bpftool` runtime counters such as `run_cnt` and `run_time_ns` depend on kernel support and BPF stats availability; the revised command handles missing fields but cannot force those counters to exist.
