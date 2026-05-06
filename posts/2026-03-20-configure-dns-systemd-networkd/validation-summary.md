# Validation Summary: How to Configure DNS Servers with systemd-networkd

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- `systemd-networkd`
- `systemd-resolved`
- `resolvectl`
- DHCP-based DNS configuration
- DNS-over-TLS

## Sources Consulted
- systemd `systemd.network` man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- systemd `resolved.conf` man page: https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html
- systemd `systemd-resolved.service` man page: https://www.freedesktop.org/software/systemd/man/latest/systemd-resolved.service.html
- systemd `resolvectl` man page: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- Local command verification on the review host: `resolvectl --help`

## Issues Found
- The introduction stated that proper integration "requires" linking `/etc/resolv.conf` to `systemd-resolved`'s stub resolver. According to `systemd-resolved.service(8)`, `systemd-resolved` supports multiple `/etc/resolv.conf` handling modes, and the stub symlink is the recommended mode rather than a strict requirement. I updated the introduction, the related command comment, and the conclusion to reflect that accurately.

## Review Notes
- No other technical issues were found in the examples or command usage.
- `resolvectl show-cache` is valid in current `systemd`, but it was added in systemd 254. Readers on older distributions may not have that subcommand available.
