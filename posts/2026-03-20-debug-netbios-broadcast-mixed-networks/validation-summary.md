# Validation Summary: How to Debug NetBIOS Broadcast Issues on Mixed Networks

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- NetBIOS over TCP/IP (NBT) — RFC 1001/1002
- WINS (Windows Internet Name Service)
- Samba (smbd, nmbd, nmblookup, smb.conf)
- tcpdump
- ISC DHCP server (dhcpd.conf, options 44 and 46)
- iptables

## Sources Consulted
- RFC 1001/1002 — NetBIOS over TCP/IP (Concepts/Methods and Detailed Specification)
- RFC 2132 — DHCP Options and BOOTP Vendor Extensions (options 44 NetBIOS Name Server, 46 NetBIOS Node Type)
- Samba `smb.conf(5)` manual — https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html (parameters `wins support`, `wins server`, `name resolve order`, `disable netbios`)
- Samba `nmblookup(1)` manual — https://www.samba.org/samba/docs/current/man-html/nmblookup.1.html (flags `-R`, `-U`, `-B`)
- ISC DHCP `dhcp-options(5)` manual (`netbios-name-servers`, `netbios-node-type`)
- tcpdump(1) manual

## Issues Found

1. **`Setting Up WINS on Samba` — contradictory `wins support` and `wins server`.**
   The original config had both `wins support = yes` and `wins server = 192.168.1.10`. Per the Samba `smb.conf` docs, these are mutually exclusive — when `wins support = yes` the host *is* the WINS server and must not also point at one (and `wins server` must never be set to the host's own IP). Since the section is explicitly about setting up Samba *as* the WINS server, I removed the `wins server` line.

2. **Invalid `name resolve order` value `hosts`.**
   The same config block listed `name resolve order = wins bcast hosts`. The valid tokens for this parameter (per `smb.conf(5)`) are `lmhosts`, `host`, `wins`, and `bcast` — "hosts" (plural) is not recognized. Changed to `name resolve order = wins host bcast`, which matches the (correct) ordering used later in the post.

## Review Notes

- NetBIOS node type codes (B=0x1, P=0x2, M=0x4, H=0x8) are correct per RFC 2132 §8.7.
- DHCP options 44 (NetBIOS Name Server) and 46 (NetBIOS Node Type) and the ISC DHCP option names `netbios-name-servers`/`netbios-node-type` are correct.
- The `nmblookup` flags `-R` (recursion-desired bit), `-U <ip>` (unicast WINS query), and `-B <broadcast>` are all correct per the man page.
- The iptables rules block forwarding of the limited broadcast `255.255.255.255`. Linux already does not forward limited broadcasts by default, so the rule is essentially defensive — directed broadcasts (e.g. `192.168.1.255`) would be the practical concern in some setups, but the rule as written is not wrong, just narrow.
- `disable netbios = no` in the "Reducing NetBIOS Broadcasts" section is the default, so it is a no-op but not incorrect.
- Minor non-technical nit (not changed per scope): the `Tags` line contains "Window" instead of "Windows".
