# Validation Summary: How to Configure Multihoming in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, networking)
- Kubernetes (kubelet, NetworkPolicy)
- etcd (advertisedSubnets multihoming)
- VLANs (802.1Q)
- Network interface bonding (802.3ad / LACP)
- talosctl CLI

## Sources Consulted
- Talos v1.9 configuration reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos v1.11 Multihoming guide: https://docs.siderolabs.com/talos/v1.11/networking/multihoming
- Talos v1.9 Predictable Interface Names: https://docs.siderolabs.com/talos/v1.9/networking/predictable-interface-names/
- Talos talosctl CLI / networking resources: https://docs.siderolabs.com/talos/v1.9/learn-more/networking-resources
- Kubernetes NetworkPolicy v1 reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
No technical issues found.

Verifications performed:
- `machine.network.interfaces` schema fields (`interface`, `dhcp`, `addresses`, `routes`, `mtu`) match the v1alpha1 config reference.
- VLAN configuration uses the correct `vlans` array with `vlanId` field per the reference.
- Bonding configuration under `bond` correctly uses `mode`, `lacpRate`, and `interfaces` member list; `802.3ad` and `lacpRate: fast` are valid values.
- `machine.kubelet.nodeIP.validSubnets` is the documented field for restricting which node IP the kubelet selects.
- `cluster.etcd.advertisedSubnets` is the documented field for controlling which subnet etcd uses for peer communication (matches the Multihoming guide example).
- `machine.network.nameservers` is the correct field for cluster-wide DNS configuration.
- `talosctl get routes`, `talosctl get addresses`, and `talosctl get links` are all valid COSI resource names exposed via talosctl.
- The Kubernetes `NetworkPolicy` example uses the correct apiVersion (`networking.k8s.io/v1`), structure, and `ipBlock` selector format.
- The claim that lower route metric = higher priority matches standard Linux routing semantics.

## Review Notes
- Interface naming caveat: From Talos 1.5 onward, the default is systemd-style predictable interface names (e.g., `enp2s0`, `eno1`) rather than `eth0`. `eth0`/`eth1` naming still works on cloud images that pass `net.ifnames=0` (e.g., AWS) and on clusters upgraded from pre-1.5 versions, so the examples remain valid in those contexts; readers on a fresh bare-metal 1.5+ install may need to substitute predictable names or use a `deviceSelector`. The post is not incorrect, but a passing mention could help newer users.
- The bonding example sets `mtu: 9000` only on `bond1`. In practice, member interfaces must also support the higher MTU, and the surrounding switch fabric must allow jumbo frames end-to-end — this is implied but not called out.
- The DNS section mentions that nameservers are "reachable via" specific interfaces, but Talos does not pin DNS lookups to a specific interface; resolution simply uses the system routing table. This is a minor framing nuance, not an error.
