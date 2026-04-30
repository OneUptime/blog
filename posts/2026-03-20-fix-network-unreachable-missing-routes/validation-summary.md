# Validation Summary: How to Fix 'Network Unreachable' Errors Due to Missing Routes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Linux routing with `iproute2`
- Windows routing with `route`, `netstat`, and PowerShell `New-NetRoute`
- Netplan
- NetworkManager / `nmcli`
- Cisco IOS static routing and OSPF
- FRRouting (FRR) OSPF and BGP
- ICMP and traceroute behavior

## Sources Consulted
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- RFC 2328, OSPF Version 2: https://www.rfc-editor.org/rfc/rfc2328
- `ip-route(8)` man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `route(8)` man page: https://man7.org/linux/man-pages/man8/route.8.html
- `traceroute(8)` man page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Microsoft `route` command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/route_ws2008
- Microsoft `netstat` command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netstat
- Microsoft `New-NetRoute` reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netroute?view=windowsserver2025-ps
- Cisco IOS IP Routing: OSPF Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book.pdf
- Cisco OSPF redistribution guidance: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr3-fwd/ospf/ospf-configuration-guide/ospf-limit-on-number-of-redistributed-routes.html
- FRR OSPF documentation: https://docs.frrouting.org/en/stable-10.2/ospfd.html
- FRR BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRR Zebra documentation: https://docs.frrouting.org/en/latest/zebra.html
- Debian `interfaces(5)` man page: https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html

## Issues Found
- The opening explanation treated all "Network Unreachable" cases as local routing failures. I corrected it to distinguish the local `connect: Network is unreachable` case from ICMP network-unreachable messages returned by upstream routers.
- The default-route note said all non-local traffic fails when the default route is missing. I corrected this to note that only destinations without a more specific route fail.
- The Netplan persistence example showed only a bare `routes:` block. I corrected it to place the route under an interface section, which matches Netplan's documented YAML structure.
- The Cisco OSPF example said `network 10.20.30.0 0.0.0.255 area 0` redistributes a missing network. That is incorrect because the `network` command matches local interfaces for OSPF participation; it does not redistribute an arbitrary static prefix. I changed the example to `redistribute static subnets`.
- The FRR OSPF section said a neighbor "must be Full state." I corrected this because RFC 2328 allows some neighbors on broadcast/NBMA networks to remain in 2-Way while only selected adjacencies become Full.
- The FRR OSPF route-check command used `show ip route ospf`, while the documented OSPF-specific command is `show ip ospf route`. I updated the command accordingly and added an explicit main-routing-table check for the BGP case.
- The BGP troubleshooting note told readers to look for a literal "Suppressed due to..." message. I replaced that with documented FRR indicators such as `(Policy)` in summary output and general next-hop / bestpath checks.
- The traceroute interpretation said the hop before the asterisks has the routing problem. I corrected this because traceroute timeouts can also be caused by filtered or rate-limited ICMP replies, so the failure point may be at that hop or farther downstream.
- The `if-up.d` script hard-coded `IFACE="eth0"`, which made the conditional always true. I corrected it to use the `IFACE` environment variable supplied by `ifupdown`.

## Review Notes
- The `route -n` and `netstat -rn` examples are older but still valid; `ip route` and `route print` are the more direct modern commands on Linux and Windows respectively.
- The `if-up.d` script applies to systems using `ifupdown`; systems managed entirely by Netplan or NetworkManager should use those frameworks for persistent routes instead.
