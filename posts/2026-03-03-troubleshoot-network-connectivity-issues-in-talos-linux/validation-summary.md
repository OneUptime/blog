# Validation Summary: How to Troubleshoot Network Connectivity Issues in Talos Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes networking
- CNI / Flannel
- DNS and Host DNS
- nftables / ingress firewall
- DHCP
- Linux sysctl networking settings
- Packet capture / pcap / tcpdump

## Sources Consulted
- Sidero Labs Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Sidero Labs Talos networking resources: https://docs.siderolabs.com/talos/v1.11/learn-more/networking-resources
- Sidero Labs Talos Host DNS documentation: https://docs.siderolabs.com/talos/v1.12/networking/host-dns/
- Sidero Labs Talos static addressing documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/static
- Sidero Labs Talos dynamic addressing / DHCP documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/dynamic
- Sidero Labs Talos LinkConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/linkconfig
- Sidero Labs Talos ResolverConfig documentation: https://docs.siderolabs.com/talos/v1.13/networking/configuration/resolvers
- Sidero Labs Talos predictable interface names documentation: https://docs.siderolabs.com/talos/v1.9/networking/predictable-interface-names
- Sidero Labs Talos ingress firewall documentation: https://docs.siderolabs.com/talos/v1.12/networking/ingress-firewall

## Issues Found
- Replaced the `networkd` service explanation with Talos networking controllers, because current Talos networking is described as controller/resource-driven.
- Replaced `talosctl get hostdns` with `talosctl get dnsupstream`, and added `talosctl logs dns-resolve-cache`, matching the Host DNS documentation.
- Replaced DNS and DHCP log examples using `logs networkd` with `logs controller-runtime`, which is the documented place for additional network controller debugging logs.
- Replaced `talosctl get etcdmembers` with `talosctl etcd members`, the documented etcd member command.
- Replaced `talosctl get nodestatus` with `kubectl get nodes -o wide`, because Kubernetes node readiness/status should be checked through Kubernetes.
- Updated the network configuration example from older nested `machine.network` syntax to current `LinkConfig`, `ResolverConfig`, and `DHCPv4Config` documents.
- Replaced `talosctl get dhcpclientstatus` with `talosctl get operatorspecs`, which is the documented way to observe configured DHCP operators.
- Updated the interface naming explanation to reference Talos predictable interface names.
- Updated the MTU example to use a `LinkConfig` document.
- Updated the `talosctl pcap --bpf-filter` example to pass compiled tcpdump `-dd` output, because Talos expects BPF instructions rather than a raw tcpdump filter string.

## Review Notes
- The post remains a valid troubleshooting guide after these fixes. Some examples are intentionally generic and depend on the chosen CNI, Talos version, and whether Host DNS or kube-proxy replacement components are enabled.
