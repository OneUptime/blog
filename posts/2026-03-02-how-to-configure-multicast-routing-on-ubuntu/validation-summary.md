# Validation Summary: How to Configure Multicast Routing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux IPv4 multicast routing
- FRRouting PIM-SM and IGMP
- SMCRoute static multicast routing
- Linux bridge IGMP snooping
- Python UDP multicast sockets
- tcpdump and iproute2 networking tools

## Sources Consulted
- FRRouting PIM documentation: https://docs.frrouting.org/en/latest/pim.html
- SMCRoute configuration man page: https://manpages.debian.org/trixie/smcroute/smcroute.conf.5.en.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- systemd.netdev bridge options: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- RFC 5771, IANA Guidelines for IPv4 Multicast Address Assignments: https://www.rfc-editor.org/rfc/rfc5771.html
- RFC 7761, PIM-SM protocol specification: https://www.rfc-editor.org/rfc/rfc7761.html
- Python socket module documentation: https://docs.python.org/3/library/socket.html
- Local Ubuntu package metadata and command help for `frr`, `frr-pythontools`, `smcroute`, `bridge`, and `ip maddress`.

## Issues Found
- The prerequisites installed `mctools`, and the testing section installed `mcjoin`; these packages were not available in the checked Ubuntu package metadata. Replaced that workflow with a Python multicast receiver using `IP_ADD_MEMBERSHIP`, keeping the sender script.
- The kernel support section used `modprobe ip_gre`, which does not enable `CONFIG_IP_MROUTE` and is only relevant to GRE tunneling scenarios. Replaced it with a check of `/boot/config-$(uname -r)` for `CONFIG_IP_MROUTE`.
- The kernel verification command used `/proc/net/dev_mcast`, which shows device multicast filters rather than the multicast routing cache. Replaced it with `/proc/net/ip_mr_cache`.
- The FRR static RP command was incomplete. Current FRR syntax requires both the RP address and group prefix, so `rp 10.0.1.1` was changed to `rp 10.0.12.1 224.0.0.0/4` on both routers.
- The sample topology did not state that unicast routing must already work for PIM RPF lookups. Added that assumption to the topology block.
- The Netplan persistence example used `parameters: multicast-snooping: true`, but current Netplan bridge parameters do not expose that key. Replaced the example with a note to persist the sysfs setting via systemd-networkd or networkd-dispatcher.
- The TTL scoping example used invalid FRR syntax, `ip multicast boundary 15`. Replaced it with the SMCRoute `phyint eth1 enable ttl-threshold 15` syntax documented by SMCRoute.

## Review Notes
The tutorial is technically relevant and salvageable. The remaining examples assume conventional interface names and lab addressing; readers may need to adapt interface names, receiver interface IPs, firewall policy, and unicast routing for their environment.
