# Validation Summary: How to Use Talos Linux with Layer 2 Networks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux networking
- Layer 2 networking
- VLANs
- Linux bonding/LACP
- MetalLB Layer 2 mode
- Kubernetes LoadBalancer Services
- ARP/NDP packet capture and troubleshooting

## Sources Consulted
- Talos Linux v1.12 LinkConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/linkconfig
- Talos Linux v1.12 VLAN guide and VLANConfig reference: https://docs.siderolabs.com/talos/v1.12/networking/logical/vlan and https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/vlanconfig
- Talos Linux v1.12 Bond guide and BondConfig reference: https://docs.siderolabs.com/talos/v1.12/networking/logical/bond and https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/bondconfig
- Talos Linux v1.12 Layer2VIPConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/layer2vipconfig
- Talos Linux talosctl pcap reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB configuration and API reference: https://metallb.io/configuration/ and https://metallb.io/apis/

## Issues Found
- The Talos network configuration snippets used older `machine.network.interfaces` fields and invalid current field names such as `vlan.vlanId` and `bond.hashPolicy`. Updated the examples to current Talos network config documents: `LinkConfig`, `VLANConfig`, `BondConfig`, and `Layer2VIPConfig`.
- Bond examples used `hashPolicy`; Talos documents the field as `xmitHashPolicy`. Updated the LACP and balance-xor examples.
- VLAN examples modeled VLANs as separate interfaces with a `vlan` object. Current Talos documentation uses `VLANConfig` with `parent` and `vlanID`. Updated the VLAN and bond-plus-VLAN examples.
- The VIP example used the legacy inline `vip.ip` form. Updated it to `Layer2VIPConfig` and added the documented etcd election caveat.
- The MetalLB Layer 2 explanation said traffic is directed to the node hosting the service. MetalLB Layer 2 mode elects one node to receive traffic for a service IP, and kube-proxy forwards to pods. Updated the explanation and included NDP for IPv6.
- The `talosctl pcap --bpf-filter` examples passed plain tcpdump filter expressions. Talos expects compiled BPF instructions from `tcpdump -dd`. Updated the ARP and VLAN capture commands.

## Review Notes
The post is technically relevant and has been updated for current Talos v1.12 networking configuration resources. The examples remain generic; operators should still match the Talos minor version used by their cluster, because Talos networking configuration changed across releases.
