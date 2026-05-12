# Validation Summary: How to Test BGP Peering in Calico with Live Workloads

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Calico (Tigera Operator install)
- Kubernetes (kubectl, DaemonSet)
- BGP (Border Gateway Protocol)
- BIRD (Calico's BGP daemon) / birdcl CLI
- iperf3
- busybox / ping
- Mermaid diagrams

## Sources Consulted
- Calico documentation on BGP peering and calico-node architecture (https://docs.tigera.io/calico/latest/networking/configuring/bgp)
- Calico calico-node container internals and `birdcl` usage (https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs)
- BIRD Internet Routing Daemon user guide (`restart`, `show protocols`) (https://bird.network.cz/?get_doc&f=bird-4.html)
- Kubernetes `kubectl drain` reference (`--ignore-daemonsets`, `--delete-emptydir-data`) (https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain)
- Kubernetes DaemonSet API reference (apps/v1) (https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- iperf3 manual page (`-s`, `-c`, `-t`)
- busybox ping applet (`-i` interval flag)

## Issues Found
No technical issues found.

The post's commands, YAML, kubectl flags, BIRD CLI usage, and namespace references (`calico-system` for the Tigera Operator install path) all check out. The `birdcl restart BGP_<peer_ip>` example uses an angle-bracket placeholder, indicating the reader must substitute the actual Calico protocol name (e.g., `Mesh_10_0_0_1`, `Node_10_0_0_1`, or `Global_10_0_0_1` depending on peer type) — this is reasonable since the previous/next paragraph effectively directs the reader to `birdcl show protocols` to discover the live names.

## Review Notes
- For manifest-based (non-operator) Calico installs, `calico-node` runs in the `kube-system` namespace rather than `calico-system`. Readers using the legacy install path will need to adjust the `-n calico-system` flag accordingly. Not an error, but worth being aware of.
- `ping -i 0.2` in busybox relies on a sufficiently recent busybox build; very old busybox versions parsed `-i` as an integer. Modern container images (busybox 1.30+) handle fractional intervals fine.
- Mermaid `\n` line breaks inside node labels are supported by current Mermaid versions; older renderers may require `<br/>` instead.
- Calico's BGP protocol naming convention in BIRD config is `Mesh_<ip>` / `Node_<ip>` / `Global_<ip>` (dots replaced with underscores). The post's `BGP_<peer_ip>` placeholder is illustrative rather than literal — the reader is expected to look up the live name via `show protocols`.
