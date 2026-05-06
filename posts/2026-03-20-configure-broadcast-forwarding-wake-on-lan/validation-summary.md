# Validation Summary: How to Configure Broadcast Forwarding for Wake-on-LAN

## Status
validated

## Post Type
Guide

## Technologies Covered
- Wake-on-LAN (WoL)
- IPv4 directed and limited broadcast
- Cisco IOS / IOS XE directed broadcast configuration
- Linux kernel IPv4 forwarding and `bc_forwarding`
- `iptables`
- `wakeonlan`
- Python `socket`
- `tcpdump`

## Sources Consulted
- RFC 919, Broadcasting Internet Datagrams: https://www.rfc-editor.org/rfc/rfc919.html
- RFC 2644, Changing the Default for Directed Broadcasts in Routers: https://www.rfc-editor.org/rfc/rfc2644
- Cisco, Configure Layer 3 Switch for Wake-On-LAN Support across VLANs: https://www.cisco.com/c/en/us/support/docs/switches/catalyst-3750-series-switches/91672-catl3-wol-vlans.html
- Cisco IOS XE command reference for `ip network-broadcast`: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9200/software/release/17-13/command_reference/b_1713_9200_cr/ip_routing_commands.html
- Cisco Catalyst SD-WAN / IOS XE `ip directed-broadcast` guide: https://www.cisco.com/c/en/us/td/docs/routers/sdwan/17-x/systems-interfaces/systems-interfaces-guide-17-x/ip-directed-broadcast.html
- Linux kernel IP sysctl documentation (`bc_forwarding`): https://www.kernel.org/doc/html/v6.9/networking/ip-sysctl.html
- Debian `wakeonlan(1)` man page: https://manpages.debian.org/unstable/wakeonlan/wakeonlan.1.en.html
- Python `socket` library documentation: https://docs.python.org/3/library/socket.html
- Local CLI help and package metadata: `iptables --help`, `tcpdump --help`, `apt --help`, `apt-cache show wakeonlan`

## Issues Found
- The introduction and protocol explanation implied that WoL requires UDP port 9. I corrected this to say that UDP and port 9 are common, not mandatory, because the magic packet can be carried in different packets and custom ports are also used.
- The packet-addressing explanation blurred local limited broadcast (`255.255.255.255`) and remote directed broadcast. I corrected it so `255.255.255.255` is treated as local-only and remote delivery uses the target subnet's directed broadcast address.
- The Linux section was mislabeled with Cisco terminology (`ip helper` / `ip forward-protocol`) and used an `iptables` DNAT example that did not accurately describe Linux directed-broadcast forwarding. I replaced it with Linux kernel `bc_forwarding` configuration plus a forwarding rule.
- The Cisco section overstated that `ip directed-broadcast` alone is always sufficient. I added a caveat that newer IOS XE platforms may also require `ip network-broadcast` on the ingress interface.
- The relay section described the `wakeonlan` example as a relay script, and the conclusion referred to an SSH tunnel. I corrected both to describe what the post actually shows: running `wakeonlan` on a host in the target subnet, optionally triggered over SSH.

## Review Notes
- The Python example is syntactically valid and uses the correct `socket.SO_BROADCAST` behavior for sending to IPv4 broadcast addresses.
- The `wakeonlan` command examples match the current man page syntax.
- The `iptables`, `apt install`, and `tcpdump` commands are syntactically current, but exact interface names such as `eth0` and `eth1` remain environment-specific placeholders.
