# Validation Summary: How to Configure DNS Servers with Netplan

## Status
validated

## Post Type
Guide

## Technologies Covered
- Netplan
- DNS
- Linux networking
- `systemd-resolved`
- `resolvectl`

## Sources Consulted
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan examples: https://netplan.readthedocs.io/en/1.0.1/examples/
- Netplan CLI reference: https://netplan.readthedocs.io/en/latest/cli/
- `resolvectl` manual: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- `systemd-resolved.service` manual: https://www.freedesktop.org/software/systemd/man/249/systemd-resolved.html

## Issues Found
- The introduction implied DNS settings were generally passed to `systemd-resolved` or NetworkManager interchangeably. I clarified that Netplan passes DNS settings to the active renderer, and that `systemd-resolved` visibility specifically applies to `systemd-networkd`-based setups.
- The `dhcp4-overrides.use-dns: false` example was presented without noting that this override is currently documented as a `networkd`-only behavior. I added `renderer: networkd` to the example and updated the conclusion to scope the advice correctly.
- The comment `Show effective DNS in resolv.conf` was too strong for `systemd-resolved` systems, where `/etc/resolv.conf` may be a stub or a system-wide view rather than a full per-interface picture. I changed the wording to an inspection-oriented comment.
- The `dig @8.8.8.8 google.com` example bypasses the system resolver configuration and tests a specific upstream server directly. I clarified the comment so it matches what the command actually does.

## Review Notes
- The `resolvectl` verification commands are appropriate on systems using `systemd-resolved`, which is common on Ubuntu. On systems that manage DNS differently, those inspection commands may not reflect the active resolver path in the same way.
