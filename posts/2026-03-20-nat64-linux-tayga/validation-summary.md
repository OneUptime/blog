# Validation Summary: How to Set Up NAT64 with TAYGA on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TAYGA (stateless NAT64 daemon)
- NAT64 (RFC 6146 / RFC 6052 well-known prefix)
- IPv6 / IPv4 protocol translation
- Linux TUN devices
- iptables NAT (MASQUERADE)
- Linux `ip route` and sysctl IP forwarding
- systemd unit configuration

## Sources Consulted
- [tayga(8) Debian manpage](https://manpages.debian.org/unstable/tayga/tayga.8.en.html) — verified valid command-line options (`--mktun`, `--rmtun`, `-c/--config`, `-d`, `-n/--nodetach`, `-u`, `-g`, `-r`, `-p`); confirmed `--dump` is not a valid option.
- [tayga.conf(5) Debian manpage](https://manpages.debian.org/unstable/tayga/tayga.conf.5.en.html) — verified config directives (`tun-device`, `ipv4-addr`, `dynamic-pool`, `prefix`, `data-dir`) and that `ipv4-addr` may overlap with `dynamic-pool`.
- [Ubuntu tayga(8) manpage](https://manpages.ubuntu.com/manpages/bionic/man8/tayga.8.html) — cross-checked CLI options.
- [openthread/tayga tayga.conf.example](https://github.com/openthread/tayga/blob/master/tayga.conf.example) — confirmed sample configuration values used in the post.
- [RFC 6052](https://datatracker.ietf.org/doc/html/rfc6052) — verified the well-known NAT64 prefix `64:ff9b::/96` and IPv4-embedded-in-IPv6 representation.
- [RFC 3986 §3.2.2](https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2) and [curl IPv6 docs](https://curl.se/) — verified that IPv6 literals in URLs must be enclosed in square brackets.

## Issues Found

1. **Invalid `tayga --dump` command.** The post instructed readers to run `sudo tayga --config /etc/tayga.conf --dump` to inspect mappings, but TAYGA does not implement a `--dump` option (verified against the Debian/Ubuntu manpages). Dynamic mappings are persisted to `dynamic.map` inside the configured `data-dir`. Replaced the command with `sudo cat /var/db/tayga/dynamic.map`, which is the actual mechanism for inspecting dynamic IPv4↔IPv6 mappings.

2. **IPv6 literal in curl URL not bracketed.** The example `curl -6 http://64:ff9b::93.184.216.34/` is invalid syntax — RFC 3986 requires IPv6 literal addresses in URLs to be wrapped in square brackets, and curl rejects unbracketed forms. Updated to `curl -6 'http://[64:ff9b::93.184.216.34]/'` (single-quoted to prevent shell glob interpretation of the brackets).

## Review Notes
- TAYGA's self-description as a *stateless* NAT64 implementation matches the official manpage title ("stateless NAT64 daemon"), even though `dynamic-pool` introduces dynamic 1:1 mappings — each translated packet is still stateless once its mapping is established. The post's framing is accurate.
- The configuration overlapping `ipv4-addr 192.168.255.1` with `dynamic-pool 192.168.255.0/24` is explicitly permitted by TAYGA (the address is reserved out of the pool), per the upstream `tayga.conf.example` — this is correct and intentional.
- The systemd `ExecStartPre=/usr/sbin/tayga --mktun` line omits `--config`, which is fine because TAYGA defaults to `/etc/tayga.conf` when no config flag is given. The binary path `/usr/sbin/tayga` matches Debian/Ubuntu packaging; users who built from source will instead find it at `/usr/local/sbin/tayga` and may need to adjust the unit accordingly.
- The TAYGA upstream version 0.9.2 referenced in the build-from-source step is the current canonical release on litech.org; no version mismatch flagged.
- The example IPv4 `93.184.216.34` was historically associated with `example.com`; IANA reassigned the example.com A record in mid-2024, so the address is no longer authoritative for that hostname. It still works as an arbitrary example destination, so no change was made.
