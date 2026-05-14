# Validation Summary: How to Choose eBPF in Calico for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- eBPF
- iptables
- nftables
- kube-proxy
- Windows HNS
- Linux kernel requirements

## Sources Consulted
- Calico Open Source documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Open Source documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Open Source documentation: About Calico eBPF, https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico Open Source documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico Open Source documentation: Calico for Windows limitations and known issues, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Kubernetes documentation: Node Status, https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes documentation: kubectl JSONPath support and output formats, https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post said Calico eBPF mode requires Linux kernel 5.3 minimum, with 5.8+ for full feature support including DSR. Current Calico documentation requires kernel 5.10 or newer for the base eBPF dataplane, except documented RHEL backport builds, and recommends kernel 6.6 or newer for all eBPF features. Updated the kernel requirement table and related guidance.
- The post described DSR as the native mechanism for preserving source IP. Calico eBPF preserves external client source IP addresses, while DSR is a separately enabled external service mode that reduces the return-path hop and requires a compatible network. Updated the source-IP section to distinguish source IP preservation from DSR.
- The post said a mixed Linux eBPF plus Windows HNS cluster is supported. Current Calico documentation lists clusters with some eBPF nodes and some standard dataplane and/or Windows nodes as unsupported. Updated the Windows guidance and recommendation matrix.
- The post said switching dataplanes requires restarting all calico-node pods. Current operator-based guidance describes a rolling update and notes that some nodes can enter eBPF mode before others, which can disrupt NodePort traffic. Updated the best practice accordingly.
- The post said kube-proxy removal must be planned before enabling eBPF and that leaving kube-proxy running causes duplicate service processing. Current Calico documentation says kube-proxy should be disabled where supported, but on platforms where it cannot be disabled, Calico can be configured to avoid kube-proxy conflicts. Updated the guidance to reflect both supported paths.

## Review Notes
The `kubectl get nodes -o jsonpath=...` command is syntactically valid for kubectl JSONPath output and uses Kubernetes node status information documented by Kubernetes. The scale thresholds in the decision matrix are practical heuristics rather than official Calico limits.
