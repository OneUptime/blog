# Validation Summary: Troubleshooting WireGuard Request/Response Performance in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- WireGuard
- Helm
- netperf
- Linux perf
- tcpdump
- eBPF diagnostics

## Sources Consulted
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium Helm Reference for MTU and encryption settings: https://docs.cilium.io/en/latest/helm-reference/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium troubleshooting and bugtool documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- WireGuard protocol and cryptography documentation: https://www.wireguard.com/protocol/
- WireGuard quick start documentation: https://www.wireguard.com/quickstart/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Netperf training documentation for TCP_RR and `-r`: https://hewlettpackard.github.io/netperf/training/Netperf.html
- Local `ping -h` output for `-M do` and `-s` option syntax.

## Issues Found
- The MTU section said fragmentation adds extra round trips and that a failed ping means MTU is too high. Updated this to describe extra packets, reassembly, possible drops, and a path MTU that is too low for the tested payload.
- The crypto profiling section only checked AVX/SSSE3 and used `lsmod` as the WireGuard support check. Updated this to include ARM NEON and to check kernel WireGuard support through `/boot/config-$(uname -r)` before falling back to `lsmod`, since WireGuard may be built into the kernel rather than loaded as a module.
- The key rotation section used raw `wg show` and implied recent handshakes should always be within two minutes. Updated it to use Cilium's documented `cilium-dbg debuginfo --output json | jq .encryption` path and clarified that handshakes update every few minutes during active traffic.
- The prerequisites omitted `jq` even though the corrected Cilium diagnostic command uses it. Added `jq` to the prerequisite tools.
- The flowchart and troubleshooting text referred to userspace WireGuard fallback. Cilium documentation requires kernel-mode WireGuard support, so this was changed to a kernel-support check.
- The verification and conclusion gave a fixed expected overhead percentage. Reworded these as comparison to a comparable unencrypted baseline because overhead is workload and environment dependent.
- The emergency diagnostics script used older `cilium` debug subcommands. Updated connection tracking and metrics collection to use documented `cilium-dbg` commands inside the Cilium DaemonSet pod.

## Review Notes
The `MTU=1420` example is technically plausible for a common 1500-byte underlay with WireGuard overhead, but Cilium can auto-detect MTU and CNI chaining may require `cni.enableRouteMTUForCNIChaining=true`. Future revisions could make the MTU recommendation more environment-specific.
