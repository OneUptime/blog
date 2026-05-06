# Validation Summary: How to Configure DHCPv6 Client on FreeBSD

## Status
validated

## Post Type
Guide

## Technologies Covered
- FreeBSD
- IPv6
- DHCPv6
- `dhcp6c`
- Router Advertisements
- SLAAC

## Sources Consulted
- FreeBSD `dhcp6c(8)` man page: https://man.freebsd.org/cgi/man.cgi?query=dhcp6c&sektion=8&manpath=FreeBSD+15.0-RELEASE+and+Ports.quarterly
- FreeBSD `dhcp6c.conf(5)` man page: https://man.freebsd.org/cgi/man.cgi?query=dhcp6c.conf&sektion=5&manpath=FreeBSD+15.0-RELEASE+and+Ports.quarterly
- FreeBSD `ifconfig(8)` man page: https://man.freebsd.org/cgi/man.cgi?query=ifconfig&sektion=8&manpath=FreeBSD+15.0-RELEASE+and+Ports.quarterly
- FreeBSD `rtsold(8)` man page: https://man.freebsd.org/cgi/man.cgi?query=rtsold&sektion=8&manpath=FreeBSD+15.0-RELEASE+and+Ports.quarterly
- FreeBSD Handbook, Chapter 7 Network: https://docs.freebsd.org/en/books/handbook/network/
- FreeBSD ports tree `net/dhcp6/Makefile`: https://cgit.freebsd.org/ports/plain/net/dhcp6/Makefile
- FreeBSD ports tree `net/dhcp6/files/dhcp6c.in`: https://cgit.freebsd.org/ports/plain/net/dhcp6/files/dhcp6c.in
- FreeBSD ports tree `net/dhcp6/pkg-plist`: https://cgit.freebsd.org/ports/plain/net/dhcp6/pkg-plist
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861

## Issues Found
- The Router Advertisement flag explanation was oversimplified. I corrected it to reflect that `M=1` tells hosts to use DHCPv6 for address assignment and that `O` is redundant when `M` is set, while `O=1` signals other DHCPv6 configuration such as DNS.
- The post referenced `/usr/local/sbin/dhcp6c-run-hooks`, but the FreeBSD `dhcp6` package does not install that script. I replaced those lines with an optional custom-script placeholder that matches `dhcp6c.conf(5)`.
- The `rc.conf` example enabled `dhcp6c` without first enabling IPv6 on the interface. I corrected the instructions to enable IPv6 with `ifconfig_em0_ipv6="inet6 -ifdisabled accept_rtadv"` and to start `rtsold`, since Router Advertisements are still needed for host routing information.
- The manual debug example claimed to run in the foreground but omitted `-f`. I corrected the command to `dhcp6c -f -d -D em0` per `dhcp6c(8)`.
- The verification section referenced a nonexistent lease file path under `/var/db/dhcp6c/`. I removed that incorrect check and kept verification steps that are documented and valid on FreeBSD.
- The `dhclient` section incorrectly stated that FreeBSD `dhclient` supports DHCPv6. I corrected that section to distinguish FreeBSD `dhclient` as the DHCPv4 client and `dhcp6c` as the DHCPv6 client.

## Review Notes
- The FreeBSD `dhcp6` port is the long-standing WIDE/KAME implementation packaged in the ports tree, so validation was done against current FreeBSD man pages and ports metadata rather than assuming Linux or ISC DHCPv6 behavior.
- DHCPv6 on IPv6 hosts does not replace Router Advertisements for default-router discovery, so any future revisions should continue to treat RA handling as part of a working client configuration.
