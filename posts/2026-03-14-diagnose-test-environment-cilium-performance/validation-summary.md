# Validation Summary: Diagnosing Test Environment Issues in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium CLI and cilium-dbg
- Hubble
- eBPF, bpftool, and bpftrace
- Linux network diagnostics

## Sources Consulted
- Cilium command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- Cilium command reference for `cilium-dbg config`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config/
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ct_list/
- Cilium command reference for `cilium-dbg bpf nat list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium Hubble setup and CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/ and https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Hubble exporter JSON examples: https://docs.cilium.io/en/latest/observability/hubble/configuration/export.html
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- bpftool program inspection manual: https://www.mankier.com/8/bpftool-prog

## Issues Found
- The post used agent-local commands such as `cilium bpf ct list`, `cilium bpf nat list`, `cilium endpoint list`, and `cilium monitor` as if they were current Kubernetes-facing Cilium CLI commands. Current Cilium documentation exposes these operations through `cilium-dbg` inside Cilium agent pods. Updated those examples to run `cilium-dbg` through `kubectl exec -n kube-system ... -c cilium-agent -- ...`.
- The conntrack collection command used the outdated `cilium bpf ct list global` form. Current `cilium-dbg bpf ct list` accepts an optional `cluster <identifier>` argument, not `global`. Updated the command to `cilium-dbg bpf ct list`.
- The endpoint diagnostic snapshot used local agent endpoint output for what is described as a complete diagnostic snapshot. Updated it to collect cluster-wide `CiliumEndpoint` resources with `kubectl get ciliumendpoints --all-namespaces -o json`, matching Cilium's Kubernetes CRD documentation.
- The per-node Cilium configuration comparison executed `cilium config view` inside agent pods. Updated it to use `cilium-dbg config --all`, which is the documented agent-local configuration command.
- The Hubble `jq` examples read flow fields such as verdict, source, destination, and drop reason from the top-level JSON object. Current Hubble JSON examples expose flow details under `.flow`, and dropped-flow filtering is documented with `--verdict DROPPED`. Updated the commands to use `--verdict DROPPED` and `.flow`.
- The BPF program runtime example assumed `run_cnt` and `run_time_ns` are always present in `bpftool prog show --json`. bpftool documents that these statistics require kernel BPF stats collection. Added `sudo sysctl kernel.bpf_stats_enabled=1` and made the `jq` expression tolerate missing fields.

## Review Notes
The Hubble examples use documented `hubble observe` filters and JSON output, but exact JSON fields can vary by Cilium/Hubble release. Users should inspect a sample event if their deployment emits drop reason fields differently.
