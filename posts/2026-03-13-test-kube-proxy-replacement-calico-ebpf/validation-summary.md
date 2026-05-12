# Validation Summary: How to Test Kube-Proxy Replacement with Calico eBPF with Live Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (eBPF dataplane)
- Kubernetes
- eBPF
- kube-proxy
- iptables
- Direct Server Return (DSR) load balancing
- calicoctl
- FelixConfiguration custom resource

## Sources Consulted
- Calico eBPF dataplane documentation: https://docs.tigera.io/calico/latest/operations/ebpf/
- Calico eBPF troubleshooting docs (calico-node -bpf subcommand reference): https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico Enable eBPF guide (kube-proxy disable / nodeSelector patch): https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- FelixConfiguration reference (bpfEnabled, bpfExternalServiceMode): https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico system requirements (Linux kernel version): https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Kubernetes kubectl patch / DaemonSet docs: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#patch

## Issues Found
- The verification command `calico-node -bpf-nat-dump` used a hyphenated single-token form that does not match the actual Calico CLI. The Calico binary parses `-bpf` as a flag followed by space-separated subcommands (e.g. `nat dump`, `conntrack dump`). Fixed the command to `calico-node -bpf nat dump`, which matches the documented Calico eBPF troubleshooting syntax.

## Review Notes
- The `non-calico=true` nodeSelector trick used to "disable" the kube-proxy DaemonSet is the standard approach from Calico's official enablement guide and is correct.
- The `bpfEnabled` and `bpfExternalServiceMode` FelixConfiguration fields and their valid values (`true` / `"DSR"`) are correct as of Calico v3.x.
- Linux kernel 5.3+ minimum is consistent with Calico's documented minimum kernel for eBPF (though Calico also supports RHEL/CentOS kernel 4.18.0-193+ as a special case — not mentioned, but not incorrect to omit). The note that 5.8+ enables additional features is reasonable (e.g. some bounded-loop / verifier improvements land in later kernels).
- The Calico version prerequisite of v3.15+ is acceptable; Calico eBPF was tech preview in v3.13 and stable from around v3.16. Readers on the very edge of v3.15 may want to confirm DSR support.
- The "Expected: 0" output from `iptables -t nat -L | grep KUBE | wc -l` assumes the iptables chains have been flushed after kube-proxy was disabled. Stopping kube-proxy does not automatically remove the existing KUBE-* chains; users may need to flush them manually or reboot the node. This is a minor caveat rather than an inaccuracy.
- The mermaid diagram uses `\n` inside node labels for line breaks. Modern mermaid supports this, but `<br/>` is more portable across renderers. Left as-is since it is a stylistic concern, not a technical one.
- The post is short and does not actually cover "testing with live workloads" beyond a single in-cluster wget — the title is slightly broader than the body. Not a correctness issue.
