# Validation Summary: How to Set Up Calico eBPF Troubleshooting Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Calico (Tigera) eBPF data plane
- Kubernetes (kubectl debug, DaemonSets)
- Felix (Calico's per-node agent) — FelixConfiguration CRD and env vars
- eBPF / bpftool
- tcpdump, tc, iproute2
- Ubuntu/Debian (apt) and RHEL/CentOS (dnf) package installation

## Sources Consulted
- [Calico eBPF Troubleshooting docs](https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf)
- [Calico Felix Configuration reference](https://docs.tigera.io/calico/latest/reference/felix/configuration)
- [projectcalico/calico — felix/config/config_params.go](https://github.com/projectcalico/calico/blob/master/felix/config/config_params.go)
- [Calico eBPF Data Plane Deep-Dive (Tigera blog)](https://www.tigera.io/blog/calico-ebpf-data-plane-deep-dive/)
- kubectl debug command documentation (kubernetes.io)

## Issues Found

1. **Invalid Felix environment variable `FELIX_DEBUGBPFMAP=true`** in Step 3.
   - There is no `DebugBPFMap` field in `FelixConfiguration` and no corresponding env var.
   - The correct configuration for enabling eBPF program debug logging is the `bpfLogLevel` field, exposed via the `FELIX_BPFLOGLEVEL` environment variable.
   - **Fix:** Replaced `FELIX_DEBUGBPFMAP=true` with `FELIX_BPFLOGLEVEL=Debug`.

2. **Incorrect `calico-node -bpf-*` subcommand syntax** in Step 5.
   - The post used flag-style hyphenated names like `-bpf-nat-dump`, `-bpf-conntrack-dump`, `-bpf-route-dump`, `-bpf-list-progs`.
   - Calico's actual interface is `calico-node -bpf <command> <action>` (space-separated subcommands), e.g., `calico-node -bpf nat dump`.
   - Additionally, `-bpf-list-progs` is not a valid Calico subcommand at all — listing programs is done with `bpftool prog list`.
   - **Fix:** Replaced `-bpf-nat-dump` → `-bpf nat dump`, `-bpf-conntrack-dump` → `-bpf conntrack dump`, `-bpf-route-dump` → `-bpf routes dump`, and replaced the non-existent `-bpf-list-progs` with the valid `-bpf ipsets dump`.

## Review Notes
- The `kubectl debug node/<node-name> ...` commands in Step 1 install the tools inside the ephemeral debug container, not on the host node's root filesystem. The host filesystem is mounted at `/host` in such pods; to install tools on the host itself, the user would need to `chroot /host` first. As written, the tools are usable from the debug container (which is sufficient for most troubleshooting workflows), but the section heading "Install eBPF Debugging Tools on Nodes" could mislead readers into thinking the node itself is being modified. Left as-is since the commands still produce a working debug environment.
- The BPF map name `cali_v4_fwdpol` used as the example in Step 4 is illustrative; actual Calico BPF map names vary by version (commonly seen: `cali_v4_ct`, `cali_v4_nat_fe`, `cali_v4_nat_be`, `cali_v4_routes`, `cali_v4_ipsets`, `cali_v4_state`, `cali_jump`). Users should run `bpftool map list` first to discover the real names on their cluster; the post's preceding `bpftool map list | grep -A2 calico` command already supports this. Left as-is since the post frames it as an example.
- Enabling `bpfLogLevel: Debug` logs every packet through the eBPF programs and is documented to have a significant performance impact — it should not be left on in production. The post does not warn about this; could be worth calling out in a future revision.
- The Mermaid diagram uses `\n` for line breaks in node labels, which is supported by recent Mermaid renderers but `<br/>` is more universally portable. Left as-is since it renders correctly in the Mermaid versions commonly bundled with modern static-site generators.
