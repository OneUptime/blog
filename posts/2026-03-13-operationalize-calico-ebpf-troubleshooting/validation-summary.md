# Validation Summary: How to Operationalize Calico eBPF Troubleshooting

## Status
validated

## Post Type
Operational guide / Runbook template

## Technologies Covered
- Calico (eBPF dataplane, Felix, Tigera operator)
- Kubernetes (kubectl, DaemonSets, debug nodes)
- eBPF (bpftool, BPF maps, BPF filesystem)
- Prometheus / Felix metrics
- Mermaid (for the process flowchart)
- Bash (for the MTTR tracking snippet)

## Sources Consulted
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Installation CRD (`operator.tigera.io/v1`) reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico eBPF troubleshooting guide: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- `kubectl exec` command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#exec
- `bpftool-prog` man page: https://github.com/torvalds/linux/blob/master/tools/bpf/bpftool/Documentation/bpftool-prog.rst
- Notes on the BPF virtual filesystem (`bpffs`)

## Issues Found
1. **Non-existent Felix metric `felix_bpf_enabled`.** The post listed `felix_bpf_enabled == 0` as a symptom. Felix does not export a boolean `felix_bpf_enabled` metric — real eBPF-related metrics are series like `felix_bpf_dataplane_endpoints` and `felix_bpf_num_ip_sets`, while the authoritative on/off state lives in the `FelixConfiguration` (`bpfEnabled`) or the Installation CR's `linuxDataplane` field. Updated the symptom line to point at the FelixConfiguration value and the absence of attached Calico BPF programs.

2. **`kubectl exec` used with a label selector.** The Step 1 command used `kubectl exec -n calico-system -l k8s-app=calico-node -- ...`. `kubectl exec` does not support `-l/--selector` — it requires a pod name. Replaced the one-shot with a small `for` loop that iterates the pods returned by `kubectl get pod -l k8s-app=calico-node -o name` and runs `bpftool prog list` per pod, which is the documented pattern.

3. **Incorrect `calico-node -bpf-*` subcommand format.** The training-module bullet referenced `calico-node -bpf-* commands`, implying hyphenated subcommands. The actual CLI form is `calico-node -bpf <subcommand>` (space-separated, e.g. `-bpf conntrack dump`, `-bpf nat dump`, `-bpf routes dump`). Updated the bullet to use the correct space-separated form and listed a few real subcommands.

## Review Notes
- The `kubectl patch installation default --type=merge -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF"}}}'` command is correct: `linuxDataplane` accepts `Iptables` (default), `BPF`, `VPP`, and (in newer releases) `Nftables`.
- `mount -t bpf bpffs /sys/fs/bpf` is correct; `bpffs` is the conventional source name for the BPF pseudo-filesystem (any string works since the kernel ignores the source for pseudo-filesystems).
- `bpftool prog list` is valid (`list` and `show` are interchangeable under `bpftool prog`).
- The `kubectl debug node/<node> -it --image=ubuntu:22.04 -- mount -t bpf bpffs /sys/fs/bpf` workflow assumes the debug container has access to mount; in practice the host mount namespace is reached via `chroot /host` from a `nodes/proxy`-style debugger, so operators on locked-down clusters may need a slightly different invocation, but the form shown will work on most clusters where `kubectl debug node` is enabled.
- MTTR targets (30 min / 60 min / 4 h) are presented as examples; they are reasonable starting points but should be calibrated per organization.
