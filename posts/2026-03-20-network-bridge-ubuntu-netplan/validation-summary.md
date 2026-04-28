# Validation Summary: How to Create a Network Bridge on Ubuntu Using Netplan

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ubuntu (18.04+)
- Netplan (YAML network configuration)
- systemd-networkd (renderer)
- Linux Bridge (kernel bridge module)
- IEEE 802.1D Spanning Tree Protocol (STP)
- iproute2 `bridge` utility
- KVM (mentioned in context)

## Sources Consulted
- Netplan reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- systemd-networkd documentation for bridge configuration
- iproute2 `bridge(8)` man page
- IEEE 802.1D-2004 STP timer constraints
- Linux kernel `net/bridge/` source for forward-delay/max-age/hello-time ranges and behavior

## Issues Found

1. **STP timer values violated IEEE 802.1D constraints (Bridge with STP Enabled section).**
   - Original values: `forward-delay: 4`, `hello-time: 2`, `max-age: 12`.
   - IEEE 802.1D requires `2*(forward_delay - 1) >= max_age >= 2*(hello_time + 1)`.
   - With `forward-delay=4` and `hello-time=2`: max_age must satisfy `6 >= max_age >= 6`, i.e. exactly 6. The post's `max-age: 12` would violate the upper bound (`2*(4-1)=6 < 12`). While the Linux kernel does not strictly enforce these cross-relationships, the configuration is non-standard and could cause STP convergence anomalies.
   - **Fix:** Changed `max-age: 12` to `max-age: 6` to keep the "fast convergence" intent while remaining IEEE 802.1D compliant given the chosen forward-delay and hello-time.

## Review Notes

- The Netplan YAML structure (`network.version: 2`, `renderer: networkd`, `ethernets:`, `bridges:`) and all parameter names (`stp`, `forward-delay`, `hello-time`, `max-age`, `priority`, `interfaces`, `addresses`, `routes`, `nameservers`) are correct for current Netplan releases.
- `forward-delay`, `hello-time`, and `max-age` are correctly expressed in seconds for the systemd-networkd renderer (NetworkManager renderer historically uses milliseconds for some values — not relevant here).
- `forward-delay: 0` with `stp: false`: Netplan passes the value through; with STP disabled the forwarding-state delay is bypassed by the kernel bridge regardless, so this works in practice.
- `netplan generate` will fail on malformed YAML, so it serves as a basic validation step, though strictly it generates backend config files. `netplan try` is the more idiomatic test command, but the existing usage is acceptable.
- All verification commands (`bridge link show`, `bridge fdb show br br0`, `networkctl status br0`, `ip addr show br0`, `ping -I br0 ...`) are syntactically correct and current.
- The default route syntax (`routes: [{to: default, via: ...}]`) is the modern Netplan form and supersedes the deprecated `gateway4`.
