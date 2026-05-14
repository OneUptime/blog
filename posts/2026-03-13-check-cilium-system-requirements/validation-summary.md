# Validation Summary: Checking Cilium System Requirements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Linux kernel
- eBPF
- bpffs
- traffic control (tc)
- WireGuard
- IPsec/XFRM
- containerd
- CRI-O
- Docker Engine with cri-dockerd

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Performance Tuning Guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Bandwidth Manager: https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/
- Cilium WireGuard Transparent Encryption: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Kubernetes Container Runtimes: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes Container Runtime Interface: https://kubernetes.io/docs/concepts/containers/cri/

## Issues Found
- The kernel baseline was outdated. Current Cilium documentation lists Linux kernel 5.10 or later, or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel, as the baseline for current releases. Updated the minimum version comments, conclusion, and checklist.
- The feature-specific kernel list included stale or incomplete gates for kube-proxy replacement, NodePort, WireGuard, bandwidth manager, and host routing. Updated the list to distinguish eBPF host routing, XDP acceleration, WireGuard module support, bandwidth manager requirements, BBR for Pods, and BIG TCP version gates.
- The BPF syscall check used `CONFIG_BPF` while describing BPF syscall support. Changed it to check `CONFIG_BPF_SYSCALL` and added the core Cilium BPF kernel options from the official system requirements.
- The iproute2 recommendation claimed a specific 5.x version that is not stated as a current Cilium requirement. Reworded it to require a modern iproute2 build with `tc` support.
- The bandwidth manager soft requirement incorrectly listed kernel 5.1 as the requirement. Updated it to check for `sch_fq` and note that BBR for Pods requires kernel 5.18 or newer.
- Fixed the "Band routing" typo and corrected the requirement to BPF host routing with kernel and feature prerequisites.
- The container runtime section listed old Cilium-specific minimum runtime versions that are not part of current Cilium system requirements. Reframed it around Kubernetes-supported CRI runtimes and noted Docker Engine's dependency on cri-dockerd for Kubernetes 1.24 and later.
- The checklist only checked generic 5.10+ kernels and would fail the documented RHEL 8.10 equivalent kernel case. Updated the check to accept RHEL 8.10-style 4.18 kernels.

## Review Notes
The post is technically relevant and now reflects current Cilium 1.19 stable documentation as of May 14, 2026. Some checks, such as `/boot/config-$(uname -r)`, can vary by Linux distribution because kernel configs may live in different locations or be exposed through `/proc/config.gz`; this is a portability caveat rather than an error in the post's command examples.
