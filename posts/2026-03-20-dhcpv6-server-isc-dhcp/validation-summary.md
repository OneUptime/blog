# Validation Summary: How to Configure a DHCPv6 Server with ISC dhcpd

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- ISC DHCP (`dhcpd`)
- DHCPv6
- IPv6
- Linux package and service management
- Router Advertisements (RA)
- DHCPv6 Prefix Delegation

## Sources Consulted
- ISC DHCP 4.4 Manual Pages - `dhcpd.conf`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 Manual Pages - `dhcpd`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- ISC Knowledge Base: Kea High Availability vs ISC DHCP Failover: https://kb.isc.org/docs/aa-01617
- ISC Blog: ISC DHCP Server has reached EOL: https://www.isc.org/blogs/isc-dhcp-eol/
- RFC 9915: Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc9915.html
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- Debian Manpages: `dhcpd(8)`: https://manpages.debian.org/bookworm/isc-dhcp-server/dhcpd.8.en.html
- Debian Sources example `dhcpd-dhcpv6.conf`: https://sources.debian.org/src/isc-dhcp/4.4.3-P1-8/doc/examples/dhcpd-dhcpv6.conf
- Debian Sources `isc-dhcp-server.init.d`: https://sources.debian.org/src/isc-dhcp/4.3.5-3%2Bdeb9u1/debian/isc-dhcp-server.init.d/
- Ubuntu package file list for `isc-dhcp-server`: https://packages.ubuntu.com/zh-cn/plucky/arm64/isc-dhcp-server/filelist

## Issues Found
- The introduction mentioned "failover considerations" for DHCPv6. ISC DHCP failover supports DHCPv4 only, so I removed that wording.
- The RHEL/CentOS install example used `yum`. I updated it to `dnf`, which matches current Red Hat-family documentation.
- The configuration used `lease-file-name` for DHCPv6. I changed it to `dhcpv6-lease-file-name`, which is the correct DHCPv6-specific directive.
- The lease file examples used a Red Hat-style path while the service example was Debian/Ubuntu-specific. I made the lease-path examples explicitly Debian/Ubuntu-specific and used `/var/lib/dhcp/dhcpd6.leases` consistently there.
- The lease-time comments mislabeled `default-lease-time` as a preferred lifetime. I corrected the comments to match DHCPv6 valid/preferred lifetime behavior.
- The Debian/Ubuntu service note referenced `/etc/default/isc-dhcp-server6`. I corrected it to `/etc/default/isc-dhcp-server`.
- The DUID lookup note incorrectly implied the server lease file exposed a simple `binding -> client-id -> duid` path. I replaced it with a client-side lookup note that is accurate for common DHCPv6 client setups.
- The stateless DHCPv6 note implied `M=0, O=1` as a strict requirement. I changed it to "commonly used" to reflect RA behavior more accurately.
- The prefix delegation example comment described the pool as a `/32` pool. I corrected it to describe the configured range instead.
- The troubleshooting note incorrectly said `dhcpd -t` might emit "Configuration file errors encountered" when the config is okay. I replaced that with an accurate description of `-t` behavior.
- The intro and conclusion did not state the current support status clearly enough. I updated both to note that ISC DHCP is end-of-life and that Kea is preferred for new deployments.

## Review Notes
- The post is now technically sound for maintaining legacy ISC DHCPv6 deployments.
- Some packaging details remain distro-specific. The article now labels Debian/Ubuntu-specific defaults and lease-file paths where relevant.
- ISC DHCP remains end-of-life as of October 5, 2022, so the tutorial is best treated as legacy-operational guidance rather than a recommendation for new infrastructure.
