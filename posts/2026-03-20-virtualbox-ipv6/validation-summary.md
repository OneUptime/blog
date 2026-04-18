# Validation Summary: How to Configure IPv6 in VirtualBox

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Oracle VirtualBox (VBoxManage CLI and GUI)
- IPv6 networking (SLAAC, DHCPv6, ULA)
- Bridged, NAT, NAT Network, and Host-Only adapter modes
- Linux guest networking (Ubuntu Netplan, iproute2)
- Windows guest networking (PowerShell `Get-NetIPAddress`, `New-NetIPAddress`)
- `ping6` / `ping -6` for connectivity testing

## Sources Consulted
- Oracle VirtualBox User Manual, Chapter on VBoxManage — https://www.virtualbox.org/manual/ch08.html
- Oracle VirtualBox Networking chapter — https://www.virtualbox.org/manual/ch06.html
- RFC 4193 — Unique Local IPv6 Unicast Addresses (ULA `fc00::/7`, locally-assigned `fd00::/8`)
- RFC 4291 — IP Version 6 Addressing Architecture (valid IPv6 address syntax: hex digits only)
- `ip -6` / iproute2 man pages
- Canonical Netplan reference — https://netplan.readthedocs.io/
- Microsoft `New-NetIPAddress` PowerShell reference — https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress

## Issues Found
- **Invalid IPv6 address `fd00:vbox::` used throughout the post.** IPv6 addresses are restricted to hexadecimal digits (0-9, a-f); the characters `v`, `o`, and `x` are not valid hex, so this literal is unparseable by every IPv6 stack and would cause `VBoxManage hostonlyif ipconfig --ipv6`, Netplan, and `New-NetIPAddress` to fail. Replaced every occurrence with the syntactically valid ULA literal `fd00:abcd::` (same `fd00::/8` locally-assigned ULA prefix, but valid hex). Affected the host-only `VBoxManage` command, Netplan YAML, PowerShell `New-NetIPAddress`, `ping6` tests, and the "Verify IPv6 Connectivity" section.

## Review Notes
- All VBoxManage flags (`--bridgeadapter1`, `--nic1`, `--nat-pf1`, `--nat-network1`, `--hostonlyadapter2`, `--ipv6`, `--netmasklengthv6`, `--port-forward-6`, `--enable`) are correct per the current Oracle manual. Note that recent manual versions also document a hyphenated `--bridge-adapter<N>` form; the older concatenated `--bridgeadapter1` still works and is left as-is.
- `ping6` is the legacy iputils name; modern Linux distributions recommend `ping -6 <addr>`. Both still work, so no change made.
- Netplan's top-level `gateway6:` key is deprecated in newer releases (≥ 0.103) in favor of `routes: [{to: default, via: ...}]`. It still functions as written; a future refresh could migrate the snippet.
- The conclusion describes ULA prefixes as `fd00::/8`, which is technically the locally-assigned half of the ULA space defined by RFC 4193 (the full ULA range is `fc00::/7`). This is a common shorthand and accurate for practical ULA usage, so left unchanged.
- `ssh -p 2222 -6 "::1"` in the NAT Network port-forward example connects to the host loopback, which is appropriate given the `[]` (any) bind address in the port-forward rule.
