# Validation Summary: Troubleshoot Cilium Fragment Handling

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- IP fragmentation
- MTU and Path MTU Discovery
- Linux networking tools

## Sources Consulted
- Cilium Fragment Handling documentation: https://docs.cilium.io/en/latest/network/concepts/fragmentation.html
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm values for MTU: https://docs.cilium.io/en/stable/helm-values/
- Cilium performance tuning MTU documentation: https://docs.cilium.io/en/stable/operations/performance/tuning.html
- Cilium `cilium-dbg monitor` troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg bpf frag list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_frag_list.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-dbg bpf metrics list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_metrics_list.html
- Kubernetes `kubectl debug` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post used `cilium monitor` and `cilium bpf ...` commands, but current Cilium troubleshooting and command references use `cilium-dbg` inside Cilium agent pods. Updated the monitor, BPF fragment, and metrics commands to use `cilium-dbg`.
- The fragment tracking section attempted to inspect fragments through the connection tracking table with `cilium bpf ct list global | grep -i frag`. Cilium provides a dedicated fragment map command, `cilium-dbg bpf frag list`, and documents fragment map pressure metrics for `cilium_ipv4_frag_datagrams` and `cilium_ipv6_frag_datagrams`. Replaced the CT-table command with the dedicated fragment map and documented metrics checks.
- The post described Cilium fragment tracking as fragment reassembly in a few places. Cilium documents this as IP fragment tracking for L4-based lookups, not general-purpose reassembly. Updated wording to "fragment tracking".
- The MTU recommendations mentioned IPIP overlay as if it were a Cilium overlay mode. Current Cilium routing documentation describes VXLAN and Geneve encapsulation modes. Replaced the IPIP recommendation with Geneve-aware wording and clarified native routing terminology.
- The prerequisite list referenced `cilium` CLI access, but the guide's agent-side diagnostic commands use `cilium-dbg`. Updated the prerequisite accordingly.

## Review Notes
Cilium automatically detects the underlying network MTU by default, and the Helm `mtu` value overrides that auto-detected MTU for Cilium-managed interfaces rather than changing the host interface MTU. For Helm-managed installations, changing the Helm value is preferable to a manual ConfigMap patch so the setting is preserved across upgrades.
