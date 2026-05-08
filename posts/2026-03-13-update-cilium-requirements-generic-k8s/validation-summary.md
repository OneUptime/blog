# Validation Summary: Update Cilium Requirements for Generic Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Linux kernel configuration
- bpffs
- containerd and CNI
- Linux networking modules

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Upgrade Guide and pre-flight check: https://docs.cilium.io/en/stable/operations/upgrade/
- Kubernetes kubectl output options: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post listed outdated kernel minimums of Linux 4.9.17+ for basic Cilium and Linux 5.3+ for kube-proxy replacement. Updated the guidance to the current Cilium requirement of Linux 5.10+ or an equivalent distribution kernel, such as 4.18 on RHEL 8.10, and noted that advanced features have their own newer kernel requirements.
- The introduction stated that the container runtime must mount the eBPF filesystem. Corrected this to the host providing the bpffs mount, with Cilium able to mount it automatically if it is missing.
- Several SSH commands used `$(uname -r)` inside double quotes, which would expand on the local machine before SSH rather than on the target node. Changed those examples to single quotes so the kernel release is evaluated on the node.
- The container runtime section implied that containerd has BPF-specific configuration. Reworded it to focus on Kubernetes CNI support and CNI plugin/configuration directories.
- The distribution package examples included kernel header/devel packages as required. Removed those from the generic package commands because Cilium's container image includes the compiler toolchain it needs, and host kernel headers are not a general Cilium Kubernetes requirement.
- The Flatcar example checked an update configuration file rather than the OS release. Changed it to `/etc/os-release`.
- The networking module examples omitted Cilium's common tunneling modules and loaded `xt_bpf` as if it were generally required. Updated the examples to include `vxlan` and `geneve` and to avoid overclaiming `xt_bpf`.
- The best-practice note said to run `cilium preflight` before installing new nodes. Updated it to match Cilium's documented pre-flight check usage for upgrades and to recommend status/connectivity validation for new installations.

## Review Notes
The guide remains intentionally high-level. Future improvements could add Cilium version-specific examples, because exact Kubernetes compatibility and Helm values can change between Cilium releases.
