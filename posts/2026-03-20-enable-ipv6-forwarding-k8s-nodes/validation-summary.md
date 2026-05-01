# Validation Summary: How to Enable IPv6 Forwarding for Kubernetes Nodes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes networking
- Linux kernel IPv6 forwarding and `sysctl`
- `kubectl`
- cloud-init
- `systemd-networkd`
- CNI-based cluster networking

## Sources Consulted
- Linux kernel IP Sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- Kubernetes dual-stack networking documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Services, Load Balancing, and Networking: https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- cloud-init headers and content types: https://docs.cloud-init.io/en/latest/reference/config-format-headers.html
- cloud-init `write_files` examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/write_files.html
- systemd `networkd.conf` man page: https://www.freedesktop.org/software/systemd/man/networkd.conf.html
- systemd `systemd.network` man page: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- Calico IPv6 host requirements: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Cilium native routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/

## Issues Found
- The description said pods "route" IPv6 traffic. It was updated to state that nodes forward IPv6 traffic for pods, which matches Linux forwarding behavior.
- The temporary `net.ipv6.conf.default.forwarding=1` command comment was imprecise. It was updated to reflect the kernel documentation: `conf/default/*` applies to interfaces created later.
- The cloud-init user-data example omitted the required `#cloud-config` header. The header was added so cloud-init will recognize the snippet as cloud-config data.
- The validation step claimed a pod-to-pod ping verifies both kube-proxy and the CNI plugin. It was corrected because Kubernetes documents kube-proxy as the Service proxy; pod-to-pod ping validates cluster pod networking instead.
- The example used `ping6`. It was updated to `ping -6`, which matches current `ping` CLI usage.
- The CNI note specifically named Calico and Cilium as potentially setting forwarding automatically. It was reworded because Calico's official IPv6 guidance requires `net.ipv6.conf.all.forwarding=1`, while automatic behavior depends on the specific CNI mode or tooling.
- The `systemd-networkd` note incorrectly suggested setting `IPv6Forwarding=yes` in a `.network` file. It was corrected to use the global `networkd.conf` setting for modern systemd, with `IPForward=ipv6` noted for older releases, and to clarify that per-interface `.network` settings alone do not enable global IPv6 forwarding.
- The introduction and closing sentence overstated the effect on all IPv6 Kubernetes networking. They were narrowed to traffic that must be routed across interfaces, across nodes, or to external networks.

## Review Notes
- `IPv6Forwarding=` in `networkd.conf` is available in newer systemd releases; older `systemd-networkd` deployments may still use `IPForward=ipv6`, which the post now notes.
- Whether forwarding is set automatically depends on the CNI and its operating mode. Verifying the effective sysctl on the node is safer than assuming provisioning or the network plugin handled it.
