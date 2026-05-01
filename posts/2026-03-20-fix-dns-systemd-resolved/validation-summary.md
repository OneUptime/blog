# Validation Summary: How to Fix DNS Resolution Errors with systemd-resolved

## Status
validated

## Post Type
Guide

## Technologies Covered
- systemd-resolved
- resolvectl
- resolved.conf
- systemd-networkd
- Docker DNS configuration
- Linux `/etc/resolv.conf`

## Sources Consulted
- systemd `resolvectl(1)`: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- systemd `resolved.conf(5)`: https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html
- systemd `systemd-resolved.service(8)`: https://www.freedesktop.org/software/systemd/man/latest/systemd-resolved.service.html
- systemd `systemd.syntax(7)`: https://www.freedesktop.org/software/systemd/man/latest/systemd.syntax.html
- Docker Engine networking DNS services: https://docs.docker.com/engine/network/
- Docker daemon troubleshooting: https://docs.docker.com/engine/daemon/troubleshoot/
- Local CLI help: `resolvectl --help`

## Issues Found
- The introduction overstated distro defaults and impact. I narrowed it to `systemd-resolved` being the local resolver on Ubuntu and many modern Linux distributions, and changed the claim that all applications stop working to a more accurate statement about many applications.
- The quick-diagnosis comments were too absolute. I changed them to "likely" outcomes, because failures can also come from upstream DNS or general resolver configuration.
- The `resolved.conf` example used an inline `#` comment on the same line as a setting. `systemd` config files treat comment markers as comments only when they begin a line, so I removed the inline comment and kept a valid minimal DNS example.
- The per-interface DNS explanation said it "overrides global" and referenced `.network` files without qualification. I changed it to describe link-specific behavior more accurately and noted that `.network` files apply when using `systemd-networkd`.
- The DNSSEC troubleshooting text implied DNSSEC failures generically, but upstream `systemd` defaults `DNSSEC=no`. I changed the wording so the failure mode is explicitly conditional on DNSSEC being enabled.
- The Docker section incorrectly configured `127.0.0.53` inside `daemon.json`. Docker documents that loopback DNS addresses are interpreted inside the container namespace, so I replaced the example with reachable upstream DNS servers and clarified the behavior.
- The final DNSSEC check used `resolvectl query --type=DNSSEC`, but `DNSSEC` is not a valid RR type for `resolvectl query`. I replaced it with a normal `resolvectl query` example and noted the `Data is authenticated:` output.
- The conclusion said persistent configuration should always be done in `/etc/systemd/resolved.conf`. I corrected this to distinguish global resolver settings from per-interface settings managed by `systemd-networkd` or another network manager.
- The static `/etc/resolv.conf` example incorrectly said the file was managed by `systemd-resolved`. I changed that comment to describe it as a static stub configuration.

## Review Notes
- Upstream systemd defaults both `DNSSEC` and `DNSOverTLS` to `no`; some distributions may ship different defaults or drop-ins.
- `dig` is a useful verification step, but it assumes packages such as `dnsutils` or `bind-utils` are installed.
- `systemd` recommends drop-in files under `/etc/systemd/resolved.conf.d/` over modifying the main `resolved.conf` directly for local overrides.
