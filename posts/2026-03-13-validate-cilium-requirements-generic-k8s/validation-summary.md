# Validation Summary: Validate Cilium Requirements for Generic Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Linux kernel and eBPF
- CNI networking
- kubeadm
- iptables

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium Routing and Encapsulation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Kubernetes CNI Configuration: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kubeadm ClusterConfiguration API: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/

## Issues Found
- The kernel version matrix listed older or feature-specific requirements that do not match the current Cilium stable documentation. Updated it to the current Cilium recommendation of Linux kernel 5.10+ or an equivalent vendor kernel such as RHEL 8.10's 4.18 kernel, and listed the advanced feature requirements currently documented by Cilium.
- The kernel configuration check only covered three BPF options. Expanded it to include the base eBPF kernel options documented by Cilium.
- The module check described `ip_tables`, `xt_socket`, and `nf_conntrack` as required. Adjusted the wording to describe them as optional netfilter modules used by some Cilium features, and added `ip_set`.
- The VXLAN/Geneve check incorrectly referred to the `tun` module and only checked VXLAN. Corrected the wording and added a Geneve module check.
- The API server section incorrectly stated that Cilium requires `--allow-privileged=true` and `service-account-signing` checks. Replaced this with the documented CNI, service CIDR, and recommended node CIDR allocation checks.
- The system configuration section presented inotify and open-file limits as Cilium-specific requirements. Reworded these as general Kubernetes node health checks and removed unsupported numeric thresholds.
- The firewall check only inspected INPUT-chain rules for VXLAN and Geneve, which was too narrow. Updated it to include WireGuard and cilium-health ports and to avoid implying that a single iptables command proves firewall correctness.

## Review Notes
The post is now technically accurate as a generic preflight checklist. Some commands are still best-effort diagnostics because real clusters may use nftables, firewalld, cloud security groups, or managed kubelet/container-runtime layouts that are not fully visible through local shell commands.
