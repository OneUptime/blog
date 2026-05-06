# Validation Summary: How to Configure a GRE Tunnel with systemd-networkd

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- GRE tunnels
- `systemd-networkd`
- systemd `.netdev` and `.network` configuration
- `iproute2`
- `sysctl`

## Sources Consulted
- systemd `systemd.netdev` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd `systemd.network` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- systemd `networkctl` manual: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- Linux kernel IP sysctl documentation (`ip_forward`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 2784, "Generic Routing Encapsulation (GRE)": https://www.rfc-editor.org/rfc/rfc2784
- RFC 2890, "Key and Sequence Number Extensions to GRE": https://www.rfc-editor.org/rfc/rfc2890
- Local CLI help/manpage checks: `man systemd.netdev`, `man systemd.network`, `man networkctl`, `sysctl --help`, `ping -h`, `ip link help`

## Issues Found
No technical issues found.

## Review Notes
- The configuration syntax in the post matches current `systemd-networkd` documentation for `Kind=gre`, the `[Tunnel]` keys used (`Local=`, `Remote=`, `TTL=`, `Key=`), and static routes in `.network` files.
- The verification and sysctl commands are valid as written. On live systems, `systemctl restart systemd-networkd` is more disruptive than `networkctl reload` plus `networkctl reconfigure`, but the restart command is technically correct.
- The endpoint addresses `203.0.113.1` and `203.0.113.2` are documentation example addresses and must be replaced with real reachable tunnel endpoints in actual deployments.
