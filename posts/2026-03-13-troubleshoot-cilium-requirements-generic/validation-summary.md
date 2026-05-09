# Validation Summary: Troubleshoot Cilium Requirements on Generic Kubernetes Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Linux kernel and eBPF
- CNI
- Cilium CLI
- kubectl

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes CNI configuration: https://docs.cilium.io/en/latest/network/kubernetes/configuration/
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- The post stated that Linux kernel 4.9.17+ is the minimum requirement. Cilium's current stable documentation lists Linux kernel 5.10+ or an equivalent distribution kernel, such as RHEL 8.10's 4.18 kernel. Updated the prerequisite and kernel check comments.
- The bpffs check used `mount | grep bpf`, which can match unrelated BPF mounts. Updated it to `mount | grep /sys/fs/bpf`, matching Cilium's documented check.
- The post described `ip_tables`, `ip6_tables`, `xt_socket`, `xt_tproxy`, and `xt_mark` as generally required loaded modules. Cilium documents required kernel configuration options instead, with additional options for iptables masquerading, tunneling/routing, and L7/FQDN policies. Replaced the module loop and persistence example with kernel configuration checks.
- The CNI section implied that old CNI files always need manual cleanup. Cilium's default CNI management writes `/etc/cni/net.d/05-cilium.conflist` and removes other CNI configuration files by default. Updated the text to clarify that manual cleanup applies when exclusive management is disabled or during migration scenarios.

## Review Notes
The `cilium status --wait`, `cilium connectivity test`, and `kubectl -n kube-system logs -l k8s-app=cilium --tail=50` commands are valid. The cleanup examples remain intentionally narrow and should be adapted to the actual CNI filenames present on a node.
