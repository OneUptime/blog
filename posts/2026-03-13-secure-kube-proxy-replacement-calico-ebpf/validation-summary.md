# Validation Summary: How to Secure Kube-Proxy Replacement with Calico eBPF

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (eBPF data plane)
- Kubernetes
- kube-proxy
- eBPF
- iptables (KUBE-* chains)
- Direct Server Return (DSR)
- calicoctl / FelixConfiguration

## Sources Consulted
- Calico documentation — Enabling the eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation — Install in eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation — Troubleshoot eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Tigera blog — Announcing eBPF Mode GA: https://www.tigera.io/blog/announcing-ebpf-mode-ga/

## Issues Found
1. **Kernel requirement was incorrect.** The post stated "Linux kernel 5.3+ (5.8+ for full features)". Official Calico docs require Linux kernel 5.10+ (or RHEL backports). Updated the prerequisite to "Linux kernel 5.10+" and removed the inaccurate 5.8 feature-gate claim.
2. **Calico version was misleading.** The post stated "Calico v3.15+". eBPF mode was tech preview from v3.13 through v3.15 and reached GA in v3.16. Updated to "v3.16+" with a note clarifying earlier versions were tech preview.
3. **`calico-node` BPF debug command syntax was wrong.** The post used `calico-node -bpf-nat-dump` (hyphenated). The documented syntax is `calico-node -bpf nat dump` — single `-bpf` flag followed by space-separated subcommands. Fixed the command in the `Verify eBPF Service Handling` section.

## Review Notes
- The `bpfEnabled: true` and `bpfExternalServiceMode: DSR` FelixConfiguration fields are accurate. `bpfExternalServiceMode` accepts `Tunnel` (default) or `DSR`.
- The `kubectl patch ds ... nodeSelector: {non-calico: "true"}` technique to disable kube-proxy is the officially documented Calico approach for kubeadm/EKS clusters. AKS uses a different mechanism (`bpfKubeProxyIptablesCleanupEnabled: false`); readers on AKS should consult Calico's platform-specific docs.
- The DSR description is conceptually correct: the backend pod replies directly to the client, bypassing the LB node on the return path, which preserves the client source IP and reduces LB-node load.
- O(1) eBPF map lookup vs. iptables linear chain traversal is a correct conceptual comparison.
- The Kubernetes API service test using `wget -O- http://kubernetes.default.svc` will return 401/403 without auth tokens, but still validates that service IP routing works — which is the point of the test.
