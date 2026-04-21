# Validation Summary: How to Configure systemd-resolved with systemd-networkd - A Practical Guide

## Status
validated

## Post Type
Technical tutorial / practical configuration guide

## Technologies Covered
- Linux networking
- systemd-resolved
- systemd-networkd
- systemctl
- resolvectl
- DNS, DNSSEC, and DNS over TLS
- `/etc/resolv.conf`

## Sources Consulted
- systemd-resolved.service official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd-resolved.service.html
- resolved.conf official man page: https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html
- systemd.network official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- resolvectl official man page: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- systemctl official man page: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Local systemd 255 CLI help output for `resolvectl --help`

## Issues Found
- The introduction described `systemd-resolved` as a DNS resolver and name server. I changed this to "DNS resolver and local stub DNS server" because the official documentation describes it as a network name resolution service with local DNS stub listeners, not an authoritative DNS name server.
- The `/etc/resolv.conf` explanation said the symlink makes all DNS queries go through the stub listener. I narrowed this to DNS clients that read `/etc/resolv.conf`, because applications may also use glibc NSS or D-Bus APIs directly.
- The DNSSEC test command used `resolvectl query --dnssec=yes google.com`, but `resolvectl query` does not support a `--dnssec` option. I changed it to `resolvectl query --validate=yes google.com`, matching the documented `--validate=BOOL` option.

## Review Notes
- The `DNS=`, `FallbackDNS=`, `Domains=`, `DNSSEC=`, `DNSOverTLS=`, and `Cache=` configuration keys are valid for current systemd documentation.
- The `~.` routing-only domain behavior is correct: it routes queries that do not match a more specific domain routing entry to the DNS servers for that link.
- `DNSSEC=yes` must be enabled in resolved configuration for DNSSEC validation to apply; `resolvectl query --validate=yes` allows normal validation behavior but does not enable DNSSEC by itself.
- `DNSOverTLS=opportunistic` is valid but does not authenticate the server against man-in-the-middle attacks; `DNSOverTLS=yes` with `address#server_name` is the stricter encrypted mode.
- `.local` has special Multicast DNS behavior in systemd-resolved. The example explicitly configures `example.local`, so it is usable here, but a future revision could mention this caveat for production private DNS zones.
