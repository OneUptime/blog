# Validation Summary: How to Troubleshoot Netplan Configuration Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Netplan (Ubuntu network configuration)
- systemd-networkd
- NetworkManager
- YAML
- journalctl / systemctl
- networkctl, nmcli, ip

## Sources Consulted
- Netplan official documentation: https://netplan.readthedocs.io/
- Ubuntu Server Netplan documentation: https://documentation.ubuntu.com/server/explanation/networking/about-netplan/
- netplan-try(8) manpage: https://manpages.ubuntu.com/manpages/focal/man8/netplan-try.8.html
- Netplan gateway4 deprecation notes (community sources)

## Issues Found
No technical issues found. All commands, flags, file permissions, and deprecation notes are accurate:
- `netplan generate` correctly validates YAML and reports file/line/column errors.
- `chmod 600` + `root:root` ownership matches current Netplan requirements (newer versions warn on looser permissions).
- `netplan --debug apply` / `netplan --debug generate` are valid (debug flag precedes subcommand).
- `gateway4` is indeed deprecated; the `routes:` replacement is recommended.
- `netplan try` auto-reverts after 120s, which is the correct remote-safety recommendation.
- Renderer values `networkd` and `NetworkManager` are correct (case-sensitive).
- `networkctl status <iface>` and `nmcli device status` are valid.

## Review Notes
- The inline comment `Use routes: - to: default via: x.x.x.x` is a compressed hint rather than a literal YAML snippet. The actual multi-line YAML would be `routes:\n  - to: default\n    via: x.x.x.x`. As an inline comment pointing the reader to the right keys, it is acceptable and not technically wrong.
- Post relies on defaults available in Ubuntu 18.04+ (Netplan is the default network tool). No version-specific caveats needed.
