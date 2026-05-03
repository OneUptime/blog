# Validation Summary: How to Create .network Files in systemd-networkd

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- systemd-networkd
- systemd .network configuration files
- Linux networking (static IP, DHCP, routes, DNS)
- networkctl
- iproute2 (`ip addr`, `ip route`)
- Network bonding/bridging (referenced)

## Sources Consulted
- `man systemd.network` (systemd.network(5) — official manual page)
- systemd upstream documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- `man networkctl` (networkctl(1))
- `man systemd-networkd` (systemd-networkd(8))

## Issues Found
No technical issues found.

Verified items:
- Configuration directory `/etc/systemd/network/` is correct (along with `/run/systemd/network/` and `/usr/lib/systemd/network/`).
- File ordering by numeric prefix is accurate; the man page recommends prefixing with a number smaller than 70 (e.g. `10-eth0.network`).
- `[Match]` section directives `Name=` and `MACAddress=` are valid keys.
- `[Network]` section directives `DHCP=yes`, `Address=`, `Gateway=`, `DNS=`, and `Bond=` are all valid.
- Multiple `Address=` lines on a single interface are supported.
- `[Route]` section with `Destination=`, `Gateway=`, and `Metric=` is correct syntax.
- The `[Link]` section reference (for MTU, checksums) in the summary is accurate.
- Verification commands (`networkctl list`, `networkctl status <iface>`, `ip addr show`, `ip route show`, `systemctl restart systemd-networkd`) are all valid.

## Review Notes
- The post is concise and serves well as a quick-reference cheat sheet. It does not go into more advanced topics like address pools, IPv6 RA settings, RoutingPolicyRule, DHCP server mode, or wait-online behavior — but those are reasonably out of scope for an introductory post.
- For modern systemd versions, `networkctl reload` can be used to apply changes without restarting the service entirely; `systemctl restart systemd-networkd` as shown still works correctly. This is a minor enhancement opportunity, not an error.
- The Bond example shows attaching a member interface to a bond — note that the bond device itself must also be defined in a `.netdev` file (out of scope for this post, but worth a follow-up).
