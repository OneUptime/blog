# Validation Summary: How to Troubleshoot DNS Server IPv6 Binding Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- DNS over IPv6
- Linux IPv6 networking and sysctl settings
- BIND/named
- Unbound
- CoreDNS error behavior
- systemd-resolved
- iproute2, ss, ip6tables, dig, netcat, strace
- systemd service drop-ins

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.12/networking/ip-sysctl.html
- BIND 9.18 Configuration Reference, `listen-on` and `listen-on-v6`: https://bind9.readthedocs.io/en/v9.18.45/reference.html
- ISC Knowledge Base, BIND IPv4/IPv6 defaults and BIND 9.10 `listen-on-v6` change: https://kb.isc.org/docs/aa-00821
- ISC Knowledge Base, BIND interface selection behavior: https://kb.isc.org/docs/aa-00420
- BIND 9.18 manual pages for `named` and `dig`: https://bind9.readthedocs.io/en/v9.18.45/manpages.html
- NLnet Labs Unbound `unbound.conf(5)` documentation: https://www.nlnetlabs.nl/documentation/unbound/unbound.conf/
- systemd `resolved.conf(5)` manual page: https://man.archlinux.org/man/core/systemd/resolved.conf.d.5.en
- RFC 4862, IPv6 Stateless Address Autoconfiguration and Duplicate Address Detection: https://datatracker.ietf.org/doc/html/rfc4862
- iproute2 `ip-address(8)` manual page: https://manpages.opensuse.org/Leap-16.0/iproute2/ip-address.8.en.html
- Linux `bind(2)` manual page: https://man7.org/linux/man-pages/man2/bind.2.html
- Linux `strace(1)` manual page: https://man7.org/linux/man-pages/man1/strace.1.html

## Issues Found
- The introduction referenced `bind-interfaces` as though it applied to the covered BIND/named troubleshooting flow. Changed this to "explicit listen-address configuration" because `bind-interfaces` is not a BIND option.
- The IPv6 sysctl check treated `net.ipv6.conf.all.disable_ipv6` as a reliable status value. Updated the example to check `default` and the target interface, while still using `all` for re-enabling all interfaces.
- The systemd-resolved section said the default stub listener uses `[::1]:53`. Updated it to `127.0.0.53:53` and noted that IPv6 stub listeners require extra configuration.
- The BIND section said a missing `listen-on-v6` prevents IPv6 listening. Modern BIND listens on IPv6 by default, so the post now warns about explicit `listen-on-v6 { none; };` instead.
- The BIND-specific notes referred to `bind-interfaces`; changed this to binding to a specific IPv6 address.
- The Unbound systemd drop-in example wrote into a directory that may not exist and omitted `systemctl daemon-reload`. Added `mkdir -p` and `systemctl daemon-reload`.
- The firewall test used `nc -u -z` as if it reliably proved UDP DNS availability. Replaced the netcat probes with `dig` tests over UDP and TCP.
- The conclusion repeated the outdated "missing `listen-on-v6`" claim. Updated it to refer to `listen-on-v6` directives that explicitly disable IPv6.

## Review Notes
The commands assume root privileges and Linux distributions that use `systemd`, `iproute2`, and `ip6tables`. The `2001:db8::/32` addresses are documentation examples and must be replaced with real server addresses in production.
