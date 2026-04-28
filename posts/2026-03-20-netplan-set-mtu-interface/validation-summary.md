# Validation Summary: How to Set the MTU on an Interface with Netplan

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Netplan (YAML-based network configuration tool for Linux)
- systemd-networkd (renderer)
- Linux networking (iproute2 / `ip link`)
- ICMP / `ping` for path MTU verification
- Jumbo frames (9000 bytes)
- WireGuard (referenced for tunnel MTU sizing)

## Sources Consulted
- Netplan reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/ (verified `mtu` is a valid integer property under interface definitions)
- Netplan CLI documentation for `netplan try` and `netplan apply` (verified default rollback timeout of 120 seconds)
- iproute2 `ip-link(8)` man page (verified `ip link set <iface> mtu <bytes>` syntax)
- WireGuard documentation / mailing list guidance on default MTU (1420 bytes = 1500 - 80 byte overhead)
- IETF RFC 791 (IP) and RFC 792 (ICMP) — confirmed 20-byte IPv4 header + 8-byte ICMP header = 28 bytes overhead, so `ping -s 8972` produces a 9000-byte IPv4 packet
- IEEE 802.3 standard Ethernet payload (1500 bytes) and de facto jumbo frame size (9000 bytes)

## Issues Found
No technical issues found.

All commands, configuration syntax, and numerical claims verified:
- Default Ethernet MTU of 1500 bytes is correct.
- Jumbo frame size of 9000 bytes is the de facto standard.
- The Netplan `mtu` key is valid under `ethernets.<iface>` and accepts an integer in bytes.
- The `routes:` block with `to: default` / `via:` is the current recommended syntax (replacing the deprecated `gateway4`).
- `netplan try` does default to a 120-second rollback timer.
- `ping -M do -s 8972` correctly produces a 9000-byte unfragmented IPv4 ICMP echo request (28 bytes of headers + 8972 bytes payload).
- WireGuard's default MTU of 1420 is correct (1500 underlying MTU minus 80 bytes of WireGuard + UDP + IP overhead).
- `ip link set eth0 mtu 9000` is the correct temporary command.

## Review Notes
- The post correctly notes that all devices in the path must support the same MTU; this is critical guidance.
- The cloud MTU example of 1450 is accurate for some providers (e.g., GCP uses 1460 by default; some overlay networks use 1450). Readers should consult their specific cloud provider's documentation.
- The post uses `eth0` as a generic interface name; modern systems typically use predictable naming (e.g., `enp0s3`, `ens3`). This is a reasonable simplification for tutorial purposes.
- `ping -M do` is Linux-specific (`-M` selects path-MTU discovery strategy, `do` = "Do not fragment"). Cross-platform readers on macOS would use `ping -D -s 8972`.
- For IPv6 path MTU testing, the header overhead is 48 bytes (40 IPv6 + 8 ICMPv6), so the equivalent payload would be 8952 — not covered in the post but a potential future enhancement.
