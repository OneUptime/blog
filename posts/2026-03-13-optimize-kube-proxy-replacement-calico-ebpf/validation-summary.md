# Validation Summary: How to Optimize Kube-Proxy Replacement with Calico eBPF for Production

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
- Direct Server Return (DSR)
- FelixConfiguration / calicoctl
- kubectl

## Sources Consulted
- Calico — Enabling the eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico — Troubleshoot eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico — System requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- What's new in Calico v3.13 (eBPF tech preview): https://www.projectcalico.org/whats-new-in-calico-v3-13/
- What's new in Calico 3.16 (eBPF GA): https://www.projectcalico.org/whats-new-in-calico-3-16/

## Issues Found
1. **Incorrect `calico-node` BPF command syntax** — The post used `calico-node -bpf-nat-dump` (hyphens connecting subcommands). The canonical Calico form uses spaces: `calico-node -bpf nat dump`. Fixed to use spaces.
2. **Incorrect kernel requirement** — The post claimed "Linux kernel 5.3+ (5.8+ for full features)". For open-source Calico, the eBPF dataplane requires kernel **5.10+** (CO-RE support). The 5.3+ minimum is for Calico Enterprise. Updated to `5.10+`.
3. **Incorrect Calico version for eBPF availability** — The post said `Calico v3.15+`. The eBPF dataplane shipped as tech preview in v3.13 and reached GA in **v3.16**, not v3.15. Updated to `v3.16+`.

## Review Notes
- `bpfEnabled: true` and `bpfExternalServiceMode: "DSR"` are correct FelixConfiguration field names.
- The `kubectl patch ds` approach using `nodeSelector: {"non-calico":"true"}` is the canonical Calico-recommended reversible way to disable kube-proxy.
- The "iptables KUBE rules → 0" check is generally valid after kube-proxy is disabled and Calico eBPF is enabled, although some kube-proxy versions may need additional cleanup (`iptables -t nat -F`) before the count reaches zero on all nodes — readers may want to verify per node.
- The mermaid diagram uses `O1` instead of `O(1)` to avoid mermaid parsing issues with parentheses, which is a reasonable workaround.
