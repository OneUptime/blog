# Validation Summary: How to Use systemd-resolved for DNS Configuration on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- systemd-resolved
- resolvectl CLI
- systemd-networkd
- NetworkManager
- DNS over TLS (DoT)
- DNSSEC
- LLMNR / mDNS
- Ubuntu (18.04+)

## Sources Consulted
- `systemd-resolved(8)` man page (local install)
- `resolvectl(1)` man page and `resolvectl --help` (local install)
- `systemd.network(5)` man page (for `[DHCPv4]` section reference)
- `resolved.conf(5)` documentation (https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html)
- systemd upstream documentation (https://www.freedesktop.org/software/systemd/man/latest/systemd-resolved.service.html)

## Issues Found

1. **Incorrect description of `127.0.0.54:53`** — The post stated `127.0.0.54:53` is "for link-local". This is wrong. Per the `systemd-resolved` man page, `127.0.0.54` is a secondary stub resolver that operates in "proxy"/bypass mode: it forwards queries to upstream DNS servers without local processing (no caching, no DNSSEC validation, no LLMNR/mDNS). Fixed the description to accurately reflect this.

2. **Invalid `--validate` flag usage** — The example `resolvectl query --validate dnssec-tools.org` is broken. `--validate=BOOL` requires a boolean value, so this would either error or consume `dnssec-tools.org` as the boolean value. Since DNSSEC validation is on by default (when `DNSSEC=` is enabled in `resolved.conf`), the flag is unnecessary. Removed the flag and updated the comment.

3. **Invalid `--json` usage** — The example `resolvectl query google.com --json | python3 -m json.tool` would error because `--json=MODE` requires a mode value (`pretty`, `short`, or `off`). Changed to `resolvectl query google.com --json=pretty` and removed the redundant pipe to `python3 -m json.tool`.

4. **Deprecated `[DHCP]` section in systemd-networkd** — The post used `[DHCP]` for the `UseDNS=no` setting. This section was renamed to `[DHCPv4]` (and `[DHCPv6]`) in systemd 248. Updated to `[DHCPv4]` to match current best practice.

## Review Notes
- The other CLI commands, `resolved.conf` settings, DoT hostname-pinning syntax (`#hostname`), DNSSEC modes (`yes` / `allow-downgrade`), `Domains=` routing-domain (`~`) prefix, and NetworkManager `nmconnection` keys are all accurate.
- `resolvectl llmnr` and `resolvectl mdns` with no LINK argument do work — they list per-link state for all interfaces (LINK is optional per the help output).
- The `/etc/resolv.conf -> ../run/systemd/resolve/stub-resolv.conf` relative symlink shown matches Ubuntu's default.
- `dnssec-failed.org` is a real domain commonly used for DNSSEC failure testing — appropriate reference.
- `chattr +i` to lock `/etc/resolv.conf` is correct, though users should note this also blocks systemd-resolved from rewriting it later if they re-enable the service.
