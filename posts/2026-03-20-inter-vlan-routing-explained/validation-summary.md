# Validation Summary: How to Understand Routing Between VLANs (Inter-VLAN Routing)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- IEEE 802.1Q VLANs
- Inter-VLAN routing
- `iproute2`
- Netplan
- `iptables`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/0.106.1/netplan-yaml/
- Linux kernel networking documentation for VLAN background: https://docs.kernel.org/6.15/networking/bridge.html
- Local CLI help for `iproute2`: `ip link help` and `ip link add type vlan help`
- Local CLI help for `sysctl`: `sysctl --help`
- Local CLI help for `iptables`: `iptables -m conntrack -h` and `iptables -m state -h`

## Issues Found
- The firewall example ended with `iptables -A FORWARD -j DROP`, which drops all forwarded traffic rather than only the example inter-VLAN flows. I changed the drop rules to target the two VLAN subinterfaces explicitly so the example matches the text.
- The firewall example used the older `state` matcher syntax. I updated it to `conntrack --ctstate`, which is the current matcher shown by the installed `iptables` help output.
- The verification step assumed the test host on VLAN 10 already had the Linux router configured as its default gateway. I added that prerequisite to the ping example so the test procedure is operationally correct.

## Review Notes
- The post is technically sound after the targeted fixes above.
- On many modern distributions, `iptables` is provided by the nftables-compatible backend; the commands shown here are still valid with that backend.
- The persistence examples are most directly applicable to Debian/Ubuntu-style systems, especially the Netplan section.
