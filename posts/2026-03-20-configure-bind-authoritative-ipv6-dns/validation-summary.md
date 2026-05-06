# Validation Summary: How to Configure BIND as an Authoritative IPv6 DNS Server

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- BIND 9 / `named`
- Authoritative DNS
- IPv6
- AAAA records
- Reverse DNS with `ip6.arpa`
- `dig`
- `named-checkconf`
- `named-checkzone`
- `ip6tables`

## Sources Consulted
- ISC BIND 9 Configuration Reference: https://bind9.readthedocs.io/en/latest/reference.html
- ISC BIND 9 Name Server Configuration (authoritative-only example): https://bind9.readthedocs.io/en/v9.18.1/configuration.html
- ISC BIND 9 Manual Pages (`dig`, `named-checkconf`, `named-checkzone`, `named.conf`): https://bind9.readthedocs.io/en/v9.20.20/manpages.html
- RFC 3596, DNS Extensions to Support IP Version 6: https://www.rfc-editor.org/rfc/rfc3596
- Red Hat Enterprise Linux 9, Managing networking infrastructure services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_networking_infrastructure_services/Red_Hat_Enterprise_Linux-9-Managing_networking_infrastructure_services-en-US.pdf

## Issues Found
- The post mixed Debian/Ubuntu and RHEL/CentOS instructions without noting that the config paths and systemd service names differ. I added a note clarifying that the examples use Debian/Ubuntu paths and added the RHEL/CentOS `systemctl reload named` command.
- The `named -v` example implied a fixed `BIND 9.18.x` result, but the installed version varies by distribution release. I changed that comment to reflect that version output is distro-dependent.
- The reverse-zone example was only correct for the `2001:db8::/64` prefix, not as a generic `2001:db8::/32` reverse zone example. I clarified that the zone shown is for `2001:db8::/64` and corrected the PTR-record comment so it no longer claims to cover every address from `::1` through `::20`.
- The ACL section used a second `options {}` block and an `allow-recursion` example even though the post configures an authoritative-only server with `recursion no;`. BIND permits only one `options` block per configuration, and recursive-query ACLs are not relevant to an authoritative-only setup. I replaced that section with a named ACL for the IPv6 secondary used by `allow-transfer`.
- The firewall section suggested dropping all other TCP/53 traffic after allowing the secondary, which would break normal DNS-over-TCP service. I corrected that guidance to keep TCP/53 open and restrict zone transfers in BIND with `allow-transfer`.
- The conclusion said `listen-on-v6 { any; }` is required. ISC’s documentation states that BIND listens on all IPv6 interfaces by default unless configured otherwise, so I changed that statement to the broader and technically correct requirement of having IPv6 listeners enabled.
- I normalized the `dig` examples to ISC’s documented `dig @server name type` form for clarity and consistency with the official manual.

## Review Notes
- `type master` is still supported by BIND as a synonym for `primary`, so it was left unchanged to preserve the original style.
- `edns-udp-size 4096` is valid BIND configuration syntax. Some operators now choose lower UDP payload sizes to reduce fragmentation risk, but the setting is still supported and was not changed.
- `ip6tables` remains usable, though many modern Linux distributions prefer nftables or firewalld as the frontend. The post’s firewall commands were left in `ip6tables` form after correcting the TCP/53 guidance.
- A full local config validation run was not possible in this workspace because `named-checkconf` and `named-checkzone` are not installed here.
