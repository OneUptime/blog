# Validation Summary: How to Configure Mosh for IPv6 Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Mosh (Mobile Shell)
- IPv6 networking
- SSH / OpenSSH
- ip6tables
- ufw (Uncomplicated Firewall)
- ss (socket statistics)
- sshd_config (`AddressFamily`, `ListenAddress`)
- apt / yum package managers

## Sources Consulted
- Mosh project site and documentation: https://mosh.org/
- Mosh GitHub repository and manpage: https://github.com/mobile-shell/mosh
- Mosh manpage (`man mosh`): documents `--ssh`, `--server`, port range 60000–61000, and `[user@]host` syntax
- OpenSSH `sshd_config` manpage: documents `AddressFamily` values (`any`, `inet`, `inet6`)
- iproute2 `ss` manpage: confirms `-t`, `-u`, `-l`, `-n`, `-p` flags and bracketed IPv6 output format
- ufw manpage: confirms port-range syntax `60000:61000/udp` and `comment` keyword support
- RFC 4007 (IPv6 Scoped Address Architecture): confirms `address%zone_id` notation for link-local scope IDs
- RFC 3986 / RFC 2732: bracket notation for IPv6 literals in URI/host contexts

## Issues Found
- **Inconsistent IPv6 bracket usage**: The "Connecting to an IPv6 Global Address" section's prose stated to "wrap it in square brackets," but the code example showed `mosh user@2001:db8::1` without brackets. Modern Mosh requires the bracket form to disambiguate the IPv6 colons from a port. Fixed to `mosh user@[2001:db8::1]`.
- **Link-local examples missing brackets**: The link-local examples used `mosh --ssh="ssh -6" user@fe80::1%eth0`. To be consistent with the bracket guidance and to ensure Mosh's argument parser handles the scope-ID address reliably, updated both examples to bracket the address: `user@[fe80::1%eth0]`.

## Review Notes
- The default Mosh UDP port range (60000–61000) is correct.
- `AddressFamily` values (`any`, `inet`, `inet6`) are accurate per the current `sshd_config` manpage.
- `ufw allow 60000:61000/udp comment "Mosh UDP"` is valid syntax; note that ufw applies rules to both IPv4 and IPv6 by default when `IPV6=yes` is set in `/etc/default/ufw` (the modern default).
- The `sed` substitution `'s/^AddressFamily inet$/AddressFamily any/'` only matches lines that explicitly set `AddressFamily inet`; it will not flip a commented-out default, but the post's prose is clear that this is conditional ("If `AddressFamily` is set to `inet`...").
- Link-local Mosh sessions can still be fragile in practice because the UDP transport must also bind/connect using the scope ID; the post's `--ssh="ssh -6"` workaround is the conventional approach but real-world success depends on the Mosh build's IPv6/scope handling. This is not incorrect, just worth noting as a caveat.
- The `ss -unp` example output format (bracketed IPv6 endpoints, `UNCONN` state) matches current iproute2 output.
- RHEL/CentOS instructions use `yum`; on RHEL 8+ / CentOS Stream the modern command is `dnf`, though `yum` remains as a compatibility alias. Not changed since it still works.
