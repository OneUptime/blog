# Validation Summary: How to Configure IPsec Firewall Rules for UDP 500 and 4500

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPsec / IKE / NAT-T
- Linux `iptables`
- `firewalld`
- UFW
- strongSwan

## Sources Consulted
- strongSwan, "Introduction to the IPsec Protocol": https://docs.strongswan.org/docs/latest/howtos/ipsecProtocol.html
- strongSwan, "NAT Traversal": https://docs.strongswan.org/docs/latest/features/natTraversal.html
- strongSwan, "Forwarding and Split-Tunneling": https://docs.strongswan.org/docs/latest/howtos/forwarding.html
- IETF RFC 3948, "UDP Encapsulation of IPsec ESP Packets": https://datatracker.ietf.org/doc/rfc3948/
- firewalld, "Service Examples" (`ipsec` service definition): https://firewalld.org/documentation/service/examples.html
- firewalld, `firewall-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Ubuntu `ufw(8)` manual page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu `ufw-framework(8)` manual page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw-framework.8.html
- Local `iptables-extensions(8)` and module help (`iptables -p esp -h`, `iptables -m policy -h`) to verify `esp` / `ah` protocol matches and `-m policy` syntax

## Issues Found
- The introduction and required-ports table overstated that ESP is always required. I updated them to distinguish native ESP from NAT-T, where ESP is encapsulated in UDP 4500.
- The outbound `iptables` examples matched destination ports only and omitted outbound AH. I changed the UDP examples to source-port matches and added the missing AH rule so the examples are valid for typical IKE/NAT-T traffic patterns, including NATed peers.
- The peer-restriction example could be misleading if combined with the broader INPUT rules above it, and it did not cover AH/ESP consistently. I clarified that the restrictive rules should be used instead of the broader INPUT rules and added the missing AH/ESP handling.
- The UFW section incorrectly said UFW could not handle ESP directly and suggested appending a raw rule to `/etc/ufw/before.rules`. I replaced that with direct UFW `proto esp` and `proto ah` rules because current UFW supports those protocols, and `before.rules` must use full `iptables-restore` syntax.
- The strongSwan NAT-T snippet used an outdated or ambiguous `forceencaps=yes` example. I replaced it with the current `swanctl.conf` setting `encap = yes`, which strongSwan documents for forcing UDP encapsulation.

## Review Notes
- The `firewalld` commands are valid, but they operate on the default zone unless `--zone` is specified.
- The `nc -zuv` checks are only coarse UDP reachability tests; they do not prove successful IKE negotiation by themselves.
- The post uses `iptables` syntax, which remains valid on current systems, including distributions using the nftables-backed `iptables` frontend.
