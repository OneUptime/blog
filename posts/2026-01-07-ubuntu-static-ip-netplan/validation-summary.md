# Validation Summary: How to Set Up a Static IP Address on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server (18.04+)
- Netplan (YAML network configuration)
- systemd-networkd
- systemd-resolved
- iproute2 (`ip` command)
- YAML syntax

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan official documentation: https://netplan.io/reference
- Ubuntu Server networking guide: https://ubuntu.com/server/docs/network-configuration
- systemd-networkd documentation: https://www.freedesktop.org/software/systemd/man/systemd-networkd.html

## Issues Found
- **MAC address comment inaccuracy (line ~596):** The comment stated "macaddress must be lowercase," which is incorrect. Netplan documents the MAC address format as `XX:XX:XX:XX:XX:XX` and imposes no lowercase requirement (uppercase and lowercase hex are both accepted). Changed the comment to "(standard XX:XX:XX:XX:XX:XX format)" so the guidance is accurate. The example value itself (`00:11:22:33:44:55`) was already valid.

## Review Notes
- The post correctly uses the modern `routes: - to: default` / `via:` syntax instead of the deprecated `gateway4:`/`gateway6:` keys, which is the current recommended approach.
- The dual-stack IPv6 route block places a `# IPv6 default route` comment (indented at 6 spaces) between two route list items (indented at 8 spaces). This is valid YAML — comments are ignored regardless of indentation and the sequence continues correctly — so it parses and applies as intended. It could be slightly clearer to readers if the comment were aligned with the list items, but it is not a technical error.
- `to: default` and `to: "::/0"` / `to: 0.0.0.0/0` are both documented as acceptable forms; the post's usage is correct.
- `link-local: []` to disable link-local addressing, and `wakeonlan: true`, are valid per the netplan reference.
- `routing-policy` with a single-IP `from:` value is accepted by netplan.
- `systemd-resolve --status` is the older command; the post correctly notes `resolvectl status` as the modern equivalent, so both still-supported and current commands are covered.
- The `netplan try` default timeout (120 seconds) and the `--timeout` flag are accurately described.
- Example IP ranges (192.168.x, 10.x, 172.16.x, 203.0.113.x documentation range, 2001:db8:: documentation range) are appropriate for a tutorial. The `10.0.0.50/8` example is intentionally unusual (different subnet on the same interface) but valid as illustration.
- No deprecated APIs, broken commands, or syntactically invalid configurations were found beyond the single comment fix.
