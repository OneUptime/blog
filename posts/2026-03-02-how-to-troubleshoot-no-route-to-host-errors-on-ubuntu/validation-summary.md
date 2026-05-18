# Validation Summary: How to Troubleshoot 'No Route to Host' Errors on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux networking (iproute2: `ip link`, `ip addr`, `ip route`, `ip route get`)
- Ubuntu Netplan configuration
- UFW / iptables / nftables firewalls
- NetworkManager (`nmcli`)
- net-tools (`arp`, `brctl`)
- Diagnostic utilities (`ping`, `traceroute`, `tracepath`, `nc`/netcat-openbsd, `curl`)
- Docker networking
- ICMP / EHOSTUNREACH semantics

## Sources Consulted
- iproute2 man pages (`ip-route(8)`, `ip-link(8)`, `ip-address(8)`)
- OpenBSD netcat man page / `nc -h` on Ubuntu (netcat-openbsd 1.226)
- Netplan reference documentation (https://netplan.readthedocs.io/en/stable/netplan-yaml/)
- UFW and nftables documentation (Ubuntu Server Guide)
- Linux kernel errno definitions for `EHOSTUNREACH`
- NetworkManager `nmcli(1)` documentation
- Docker networking documentation (https://docs.docker.com/network/)
- bridge-utils documentation for `brctl`

## Issues Found
- **Invalid netcat flag**: The Step 7 example used `nc -zv --wait 5 192.168.1.50 443`. OpenBSD netcat (the default `nc` shipped with Ubuntu via `netcat-openbsd`) does not support a `--wait` long option — the connection timeout flag is `-w timeout`. Changed to `nc -zv -w 5 192.168.1.50 443`, which matches the documented flag in `nc -h` and the man page.

## Review Notes
- The `arp -n` and `brctl show` commands rely on the legacy `net-tools` and `bridge-utils` packages. These are not installed by default on modern Ubuntu desktop/server, and Ubuntu recommends `ip neigh show` (replaces `arp`) and `bridge link show` / `ip link show master <bridge>` (replaces `brctl show`). The commands still work when those legacy packages are installed (which is common in admin environments), so the post is not wrong — but a future revision could mention the modern equivalents.
- The Netplan example uses the modern `routes:` syntax (rather than the deprecated `gateway4:`), which is correct for Ubuntu 20.04+ and required on Ubuntu 22.04+.
- `ip route change 192.168.1.0/24 dev eth0 metric 100` may need the full original route specification (including `proto kernel scope link src ...`) in some kernel/iproute2 versions for the change to succeed on a kernel-managed connected route; in practice users may need to `ip route del` then `ip route add` with the new metric. This is a minor caveat, not an error.
- `nmcli connection show eth0-connection` uses a placeholder connection name; readers should substitute the actual name from `nmcli connection show`. This is reasonable in a tutorial context.
- `EHOSTUNREACH` is correctly identified as the underlying errno for "No route to host", and the distinction from `ECONNREFUSED` and `ENETUNREACH` is accurate.
