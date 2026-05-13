# Validation Summary: How to Optimize Native Routing with Calico eBPF for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (eBPF dataplane)
- Kubernetes
- eBPF / bpftool
- Linux kernel networking (XDP, TC, iptables)
- kube-proxy
- iperf3 (benchmarking)
- Mermaid diagrams

## Sources Consulted
- Calico — Enabling the eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico — Troubleshoot eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico — Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico — FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico — System requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Project Calico — What's new in v3.13: https://www.projectcalico.org/whats-new-in-calico-v3-13/

## Issues Found
1. **Invalid verification command.** The original text used `kubectl exec -n calico-system ds/calico-node -- calico-node -bpf-log-level Debug` and labeled it "Verify kube-proxy replacement." `-bpf-log-level` is not a valid `calico-node` CLI flag; log level is controlled via the `bpfLogLevel` FelixConfiguration field. Additionally, even if it worked, setting a log level does not verify kube-proxy replacement. Replaced with `calico-node -bpf nat dump`, which is the documented inspection subcommand that dumps the BPF NAT map used by Calico's kube-proxy-replacement service handling.

2. **Unsupported kernel version claim.** The text claimed "5.8+ recommended for full feature support." Calico documentation does not list 5.8 as a meaningful cutoff for feature support — relevant kernel cutoffs are 5.3 (eBPF tech preview), v5.10 (recent minimum on newer Calico), and 6.x for the broadest feature set. Replaced with a more general phrasing that newer kernels are recommended for the most complete feature support, which is consistent with Calico's documented system requirements without manufacturing a specific cutoff.

## Review Notes
- The post pins v3.13+, which is when the eBPF dataplane was introduced as tech preview (GA in v3.16). For production use today, the prerequisites would more realistically be Calico v3.16+ on kernel v5.10+ (per Calico v3.29+ docs). The post is internally consistent with the v3.13 era it cites, but readers running current Calico should consult the latest system requirements.
- The post's description ("tuning BPF map sizes, enabling host-bypass, and configuring DSR") promises more than the post delivers — the actual content covers enabling eBPF mode, verifying it, and benchmarking, but does not cover BPF map sizing, host-bypass, or DSR configuration. This is a content/scope mismatch rather than a technical error, so it was left alone per the "only fix technical errors" guideline.
- `bpftool prog list | grep calico` is a reasonable sanity check but is not the canonical Calico verification path; the documented inspection tools are the `calico-node -bpf <subcommand>` family. Acceptable as a quick check.
- The `kubectl patch ds kube-proxy` node-selector trick to scale kube-proxy to zero is the standard documented approach from Calico's own docs.
- `bpfEnabled` and `bpfDisableUnprivileged` are both real FelixConfiguration fields.
- The Mermaid diagram is a simplified depiction. Calico eBPF uses TC hooks as the primary attach point; XDP support exists but is more limited in scope. Acceptable as a conceptual overview.
