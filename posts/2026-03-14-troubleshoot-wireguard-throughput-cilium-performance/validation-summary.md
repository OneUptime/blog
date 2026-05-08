# Validation Summary: Troubleshooting WireGuard Throughput in Cilium Performance

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- WireGuard
- Helm
- eBPF/BPF tooling
- Linux networking and MTU diagnostics
- perf, iperf3, tcpdump, mpstat, bpftool

## Sources Consulted
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium CLI `cilium encryption status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status/
- Cilium troubleshooting documentation for `cilium-dbg monitor --type drop`: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium CNI performance benchmark documentation: https://docs.cilium.io/en/latest/operations/performance/benchmark/
- Cilium v1.16 upgrade notes for deprecated WireGuard userspace fallback: https://docs.cilium.io/en/v1.16/operations/upgrade/
- Kubernetes `kubectl exec` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- WireGuard protocol documentation: https://www.wireguard.com/protocol/
- Local command help output for `perf top`, `perf record`, `bpftool prog`, `ip link`, and `ping`.

## Issues Found
- The post used `cilium encrypt status`, but the current Cilium CLI command is `cilium encryption status`. Updated both occurrences.
- The post used `wg show cilium_wg0` as the main peer inspection command. Cilium's official troubleshooting flow uses `cilium-dbg debuginfo --output json | jq .encryption`, so the peer inspection and handshake guidance now use that command.
- The post treated an empty `lsmod | grep wireguard` result as evidence of userspace WireGuard. That is inaccurate because WireGuard can be built into the kernel. Updated the check to use kernel config or `modinfo`, and noted the deprecated userspace fallback separately.
- The post described userspace fallback as a common current issue. Cilium deprecated the built-in WireGuard userspace fallback in v1.16, so the text now frames it as relevant to older Cilium releases.
- The MTU command `ip link show lxc*` would not expand the glob under `kubectl exec` without a remote shell. Replaced it with a shell-wrapped interface filter.
- Added the official Cilium CNI-chaining MTU caveat, `cni.enableRouteMTUForCNIChaining`, because Cilium documents it as a WireGuard fragmentation/performance concern.
- The drop-monitor command used `cilium monitor --type drop`; current in-agent command references use `cilium-dbg monitor --type drop`. Updated it to run through the Cilium DaemonSet.
- The decision tree recommended installing `wireguard-tools` to fix missing kernel support. `wireguard-tools` does not provide kernel WireGuard support, so the recommendation now points to a kernel with WireGuard support or the WireGuard kernel module.
- The verification section asserted a fixed expected 70-90% throughput range. Cilium benchmark results vary by hardware, MTU, routing mode, and stream count, so this was replaced with guidance to compare against the environment's own unencrypted baseline.
- The emergency diagnostics script used current-cluster commands as if they were local node commands (`cilium status`, `cilium bpf ct list`, `cilium metrics list`). Updated those to `kubectl exec ... cilium-dbg ...` and the current `cilium-dbg bpf ct list` syntax.
- The conclusion said WireGuard has a fixed 80-byte overhead. Updated it to 60 bytes for IPv4 and 80 bytes for IPv6.

## Review Notes
The Helm upgrade snippets are syntactically valid, but operationally disruptive; the post already warns about a brief disruption. The throughput thresholds in the decision tree remain heuristic and should be treated as prompts for investigation rather than guaranteed Cilium performance targets.
