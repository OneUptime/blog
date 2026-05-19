# Validation Summary: How to Configure GENEVE Tunnels on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Linux networking
- GENEVE tunneling
- iproute2 (`ip`, `tc`)
- Open vSwitch
- OVN
- systemd-networkd
- UFW and tcpdump

## Sources Consulted
- RFC 8926: Geneve: Generic Network Virtualization Encapsulation: https://www.rfc-editor.org/rfc/rfc8926
- `ip link help geneve` from iproute2 6.1.0
- `ip route help` from iproute2 6.1.0
- `tc-tunnel_key(8)` local man page
- systemd.netdev documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- Ubuntu systemd.netdev man page for GENEVE settings: https://manpages.ubuntu.com/manpages/noble/man5/systemd.netdev.5.html
- Open vSwitch database documentation for tunnel interface options: https://www.openvswitch.org/support/dist-docs/ovs-vswitchd.conf.db.5.html
- OVN controller documentation for `ovn-encap-type` and `ovn-encap-ip`: https://www.ovn.org/support/dist-docs/ovn-controller.8.html
- OVN northbound CLI documentation for `ovn-nbctl init`: https://www.ovn.org/support/dist-docs/ovn-nbctl.8.html

## Issues Found
- The OVS example reused the name `geneve0`, which was already used earlier for the Linux kernel GENEVE interface. Changed the OVS tunnel port name to `geneve-ovs0` to avoid an interface-name collision when readers follow multiple sections on the same host.
- The tunnel options section claimed that `ip route encap geneve ... options ...` can set GENEVE TLV options. Current `ip route help` does not list `geneve` as a route encapsulation type, so that command would fail. Replaced it with the documented `tc tunnel_key` `geneve_opts` syntax and clarified that arbitrary TLV options are not attached by the simple `ip link add ... type geneve` tunnel example.

## Review Notes
- The core `ip link add ... type geneve id ... remote ...` examples match the documented iproute2 GENEVE interface syntax.
- The systemd-networkd `[GENEVE]` `Id=` and `Remote=` keys are valid for GENEVE netdevs.
- The OVN external IDs shown are valid, but a production OVN deployment needs the OVN central services and OVSDB listener configuration to be set up consistently across all nodes.
