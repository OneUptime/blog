# Validation Summary: How to Configure a DHCPv6 Server with Kea on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ISC Kea DHCP server
- DHCPv6
- IPv6
- Linux
- systemd
- Kea high availability hooks

## Sources Consulted
- ISC Kea release and support matrix: https://www.isc.org/kea/
- Kea DHCPv6 server documentation: https://kea.readthedocs.io/en/stable/arm/dhcp6-srv.html
- Kea configuration format documentation: https://kea.readthedocs.io/en/stable/arm/config.html
- Kea hooks and HA documentation: https://kea.readthedocs.io/en/stable/arm/hooks.html
- Debian package details for `kea-dhcp6-server`: https://packages.debian.org/bookworm/net/kea-dhcp6-server
- Debian file list showing the `kea-dhcp6-server.service` unit: https://packages.debian.org/bookworm/amd64/kea-dhcp6-server/filelist
- Ubuntu package search results for Kea packages: https://packages.ubuntu.com/search?keywords=kea
- Fedora package information for `kea`: https://packages.fedoraproject.org/pkgs/kea/kea/

## Issues Found
- The Debian/Ubuntu install command used `kea-dhcp6`, but the distro package name is `kea-dhcp6-server`. I corrected the package name.
- The RHEL/CentOS/Fedora install command used `kea-dhcp6`, but Fedora-family distro packages ship the server in the `kea` package. I corrected the package name.
- The DHCPv6 config used `"dhcp-socket-type": "raw"`. Kea's DHCPv6 server does not support `dhcp-socket-type`; DHCPv6 uses UDP/IPv6 sockets only. I removed the setting.
- The systemd examples assumed a single unit name across distros. For distro packages, Debian/Ubuntu use `kea-dhcp6-server`, while Fedora-family examples use `kea-dhcp6`. I corrected the service-management examples accordingly.
- The validation example claimed `kea-dhcp6 -t` should print a specific success string. The official documentation defines success via exit status. I changed the note to match the documented behavior.
- The lease-query example referenced an unqualified control-agent call that would not work from the shown base configuration. I removed the incomplete example instead of leaving a misleading command.
- The HA example loaded only `libdhcp_ha.so`. Kea HA requires `libdhcp_lease_cmds.so` alongside `libdhcp_ha.so`. I added the missing hook and noted that hook-library paths vary by distribution.
- The conclusion stated that SQL backends are better for production performance and scalability. The official docs support using MySQL/PostgreSQL for SQL-backed lease storage, database-backed host reservations, and the configuration backend, but not that blanket performance claim. I rewrote the sentence to match the docs.

## Review Notes
- As of 2026-05-01, ISC lists Kea 3.0.2 as the current stable LTS release and 2.6.4 as another current stable stream. Package names and available hook libraries can still vary by distro repository and Kea version.
- Current Kea releases support direct HTTP/HTTPS control channels on the DHCP servers themselves. Older Control Agent-specific instructions are version-dependent.
