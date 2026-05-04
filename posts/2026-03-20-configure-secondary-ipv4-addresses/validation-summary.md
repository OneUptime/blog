# Validation Summary: How to Configure Secondary IPv4 Addresses on Router Interfaces

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Cisco IOS (interface configuration, secondary IP addressing)
- Cisco IOS DHCP server (pools, excluded-address)
- Cisco IOS OSPF (network statements, interface-level OSPF)
- Linux iproute2 (`ip addr`)
- Debian/Ubuntu `/etc/network/interfaces` (ifupdown)

## Sources Consulted
- Cisco IOS IP Addressing Services Configuration Guide — `ip address ... secondary` command reference
- Cisco IOS IP Addressing Command Reference (`show ip interface`, `show ip interface brief`)
- Cisco IOS IP Addressing Services Configuration Guide — DHCP server `network` command (`network network-number [mask | /prefix-length]`)
- Cisco IOS OSPF Configuration Guide — secondary IP behavior (no adjacency on secondaries; secondaries advertised as stub networks)
- iproute2 man pages (`ip-address(8)`)
- Debian `interfaces(5)` man page

## Issues Found
- **Phase 5 of the migration procedure (Step 4) was incorrect.** The original showed `no ip address 192.168.1.1 255.255.255.0` while the secondary `10.1.0.1` was still configured, followed by a comment claiming the new primary command "removes secondary, promotes it." In Cisco IOS, the router rejects deletion of the primary while any secondary exists with `% Must delete secondary before deleting primary`, and a primary command does not "promote" a secondary. Replaced the snippet with the correct sequence: remove the secondary first, then remove the old primary, then configure `10.1.0.1` as the new primary.

## Review Notes
- The `show ip interface` output in Step 2 is abbreviated; real output contains additional lines (MTU, Helper address, etc.) between the broadcast-address line and the secondary-address lines, but this simplification is acceptable for the tutorial.
- The OSPF note ("OSPF doesn't send Hellos on secondary interfaces, which may affect DR/BDR election") is technically conveyed but slightly imprecise: OSPF does not form adjacencies on secondary subnets at all, and DR/BDR election simply does not occur on the secondary subnet (rather than being "affected"). Wording is acceptable as written.
- The OSPF section says secondaries are "included in OSPF if the `network` statement covers them." More precisely, the OSPF `network` command matches against primary IP addresses only; once OSPF is enabled on the interface (via the primary), secondary subnets are automatically advertised as connected/stub networks regardless of whether a separate `network` statement covers them. The configuration shown still works, just with one redundant statement.
- The `arp -a | grep "192.168.1" | wc -l` verification in Phase 4 is from a Linux host's perspective; for a network-wide view, `show ip arp | include 192.168.1` on the router would be more authoritative.
- `/etc/network/interfaces` (ifupdown) is still valid on Debian, but modern Ubuntu (18.04+) defaults to netplan; readers on Ubuntu may need to use a netplan YAML configuration instead.
