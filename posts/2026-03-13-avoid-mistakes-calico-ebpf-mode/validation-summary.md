# Validation Summary: How to Avoid Common Mistakes with Calico eBPF Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Tigera Operator
- Calico eBPF dataplane
- kube-proxy
- Linux eBPF and bpftool
- Kubernetes ConfigMaps and DaemonSets

## Sources Consulted
- Calico Open Source documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Open Source documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Open Source documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source documentation: System requirements, https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Open Source documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico Open Source documentation: About Calico eBPF, https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf

## Issues Found
- The kernel guidance used the older 5.3 minimum. Current Calico Open Source documentation lists base eBPF dataplane support at Linux kernel v5.10 or newer, with RHEL backport exceptions and newer kernel requirements for some features. Updated the shell check and explanatory text to use 5.10 as the current base requirement and 6.6 as the newer-feature threshold.
- The eBPF enablement commands used `installation default` and did not show the current operator-managed kube-proxy path. Updated commands to use `installation.operator.tigera.io` and added the documented `bpfNetworkBootstrap` and `kubeProxyManagement` settings for compatible self-managed clusters.
- The kube-proxy explanation claimed double NAT. Official documentation frames the issue as avoiding confusion over service handling and avoiding conflicts with Calico's cleanup of kube-proxy iptables rules. Updated the explanation accordingly.
- The API server ConfigMap correction implied a single real control plane node IP is always the right value. Official documentation recommends a stable real API server address, such as a load balancer address for highly available control planes. Updated the wording while preserving the example.
- The hostPorts section said hostPorts are not supported and must be disabled. Current Calico eBPF switch-over guidance uses `hostPorts:null` in the operator patch, and the Installation API documents `hostPorts` as a valid Calico CNI field. Updated the section to warn against forcing `hostPorts: Disabled` from older guidance and to show the current unset/omitted form.
- The post-reboot shell check could assign `0 0` when `grep -c` found no matches because `grep -c` prints zero and exits non-zero. Replaced `|| echo 0` with `|| true`.
- The reboot fallback text and conclusion overstated iptables fallback and referenced a specific metric without official confirmation in the reviewed docs. Updated the language to focus on verifying Felix logs/metrics and on the documented unsupported mixed eBPF/standard dataplane state.

## Review Notes
The examples are intentionally generic. In production, operators should also account for platform-specific guidance such as AKS kube-proxy limitations, IPVS-to-iptables migration before eBPF enablement, stable API server DNS or load balancer addresses, and RHEL kernel backports.
