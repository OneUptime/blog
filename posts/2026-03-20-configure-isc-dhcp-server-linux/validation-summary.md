# Validation Summary: How to Configure ISC DHCP Server (dhcpd) on Linux

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ISC DHCP Server (dhcpd) 4.x
- `/etc/dhcp/dhcpd.conf` configuration language
- `/etc/default/isc-dhcp-server` Debian/Ubuntu service defaults
- systemd (`systemctl`, `journalctl`)
- DHCP lease database (`/var/lib/dhcp/dhcpd.leases`)
- Debian/Ubuntu `apt` and Fedora/RHEL `dnf` package managers

## Sources Consulted
- ISC DHCP 4.4 documentation and Knowledgebase: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- dhcpd(8) manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- dhcpd.conf(5) manual page (statements: `authoritative`, `ping-check`, `ping-timeout`, `default-lease-time`, `max-lease-time`, `range`, `host`, `hardware ethernet`, `fixed-address`, `option`)
- ISC DHCP source (`server/dhcpd.c`) — confirms `--version` argument handling exists
- Debian `isc-dhcp-server` package documentation for `INTERFACESv4`/`INTERFACESv6` defaults file format
- Fedora `dhcp-server` package metadata (renamed from `dhcp` in Fedora 28+/RHEL 8+)

## Issues Found
No technical issues found. All commands, configuration directives, file paths, and service names verified against official documentation:
- Package names correct for both distro families.
- `dhcpd --version` is a valid flag (parsed in `dhcpd.c` main).
- All `dhcpd.conf` statements (`authoritative`, `log-facility`, `ping-check`, `ping-timeout`, `option domain-name-servers`, `option ntp-servers`, `default-lease-time`, `max-lease-time`, `range`, `subnet ... netmask`, `host ... hardware ethernet`, `fixed-address`, `option host-name`) match dhcpd.conf(5) syntax.
- `INTERFACESv4="..."` is the correct variable in modern `/etc/default/isc-dhcp-server` (post-IPv4/IPv6 split).
- `dhcpd -t -cf <file>` syntax-check usage is correct.
- Lease file path `/var/lib/dhcp/dhcpd.leases` is correct for Debian/Ubuntu (the implicit target distro of the service-management section).
- `authoritative` directive description is accurate — it permits the server to issue DHCPNAK responses for addresses outside its known scopes.

## Review Notes
- **EOL notice**: ISC announced end-of-life for ISC DHCP in late 2022; ISC now recommends Kea DHCP as the modern replacement. The post does not mention this, which would be useful context for readers planning new deployments. The information presented is still accurate for users maintaining existing ISC dhcpd installations.
- **Distro-specific service/path divergence**: The post mixes Debian/Ubuntu and RHEL/Fedora installation but the service-management and lease-file paths are Debian-flavored only. On RHEL/Fedora the service unit is `dhcpd.service` (not `isc-dhcp-server`), the defaults file `/etc/default/isc-dhcp-server` does not exist (interfaces are typically configured via `/etc/sysconfig/dhcpd` `DHCPDARGS=` or by binding via routing), and the lease file is `/var/lib/dhcpd/dhcpd.leases`. A future revision could add a brief note pointing out these differences.
- **Code block language tag**: The configuration example is tagged ```nginx``` for highlighting. dhcpd.conf has no first-class highlighter in most renderers, and `nginx` produces a reasonable approximation given the shared `directive value;` and `block { ... }` style — this is a defensible cosmetic choice.
- **`ping-check`**: Enabling ICMP probing adds latency to every DHCPOFFER (default `ping-timeout 1` second). Worth flagging for high-churn networks, but the configuration shown is correct.
