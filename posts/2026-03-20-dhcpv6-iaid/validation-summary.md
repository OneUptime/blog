# Validation Summary: Understanding DHCPv6 IAID (Identity Association Identifier)

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- DHCPv6
- IPv6
- RFC 8415 Identity Associations (`IA_NA`, `IA_TA`, `IA_PD`)
- `systemd-networkd`
- `wide-dhcpv6-client` / `dhcp6c`
- Windows `netsh`
- Kea DHCPv6
- `tcpdump`
- Wireshark

## Sources Consulted
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415.html
- `systemd.network(5)`: https://www.freedesktop.org/software/systemd/man/254/systemd.network.html
- `networkd.conf(5)`: https://www.freedesktop.org/software/systemd/man/254/networkd.conf.html
- `networkctl(1)`: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- `dhcp6c.conf(5)` for `wide-dhcpv6-client`: https://manpages.debian.org/stretch/wide-dhcpv6-client/dhcp6c.conf.5.en.html
- Microsoft Learn, `netsh interface`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Wireshark Display Filter Reference for DHCPv6: https://www.wireshark.org/docs/dfref/d/dhcpv6.html
- Kea DHCPv6 server documentation: https://kea.readthedocs.io/en/kea-2.7.7/arm/dhcp6-srv.html

## Issues Found
- The post described IAIDs too narrowly as per-interface identifiers. RFC 8415 defines an IAID as identifying an IA, with uniqueness scoped to IA type on the client. I updated the introduction, IA definition, comparison table, best-practices note, and conclusion to match the RFC model.
- The `systemd-networkd` section claimed the default IAID comes from the interface index. Current systemd documentation exposes `IAID=` as a configurable 32-bit value but does not document that interface-index default, so I removed that claim and kept the documented configuration guidance.
- The rationale for pinning IAIDs was tied to `systemd-networkd` "regenerating" them after hardware changes. I rewrote that explanation to the protocol-correct behavior: if the IAID changes, the server treats it as a different IA and may assign a different address or delegated prefix.
- The post labeled a DHCPv6 client configuration example as `dhclient`, but the syntax (`send ia-na`, `send ia-pd`, `id-assoc`, `prefix-interface`, `sla-id`, `sla-len`) is from `wide-dhcpv6-client` / `dhcp6c`. I renamed the relevant sections, corrected the config path to `/etc/wide-dhcpv6/dhcp6c.conf`, and fixed the interface-stanza syntax.
- The Windows section implied `netsh interface ipv6 show addresses` reveals the IAID. Microsoft documents that command for showing IPv6 addresses, not IAIDs, so I changed the text to say the command shows DHCPv6-managed addresses but not the IAID itself.
- The Wireshark filter field was incorrect. I changed `dhcpv6.iaaddr.iaid` to the documented `dhcpv6.iaid`.
- The troubleshooting section suggested deleting `/var/lib/systemd/network/*.lease` to force IAID regeneration. I replaced that with documented `networkctl reload` and `networkctl reconfigure` steps for applying `systemd-networkd` configuration changes.

## Review Notes
- `IA_TA` is defined by RFC 8415, but it is less commonly used in practice than `IA_NA` and `IA_PD`.
- The `journalctl -u systemd-networkd | grep -i iaid` troubleshooting command may or may not show useful output depending on logging level; packet capture and explicit configuration checks are more portable.
