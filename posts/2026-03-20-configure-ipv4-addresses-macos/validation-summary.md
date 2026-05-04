# Validation Summary: How to Configure IPv4 Addresses on macOS

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- macOS (Ventura and later — System Settings reorganization)
- `networksetup` CLI (macOS network configuration utility)
- `ifconfig` (BSD interface configuration tool)
- `route` (BSD routing table utility)
- `dscacheutil` (Directory Service cache utility)
- `mDNSResponder` (Bonjour / multicast DNS daemon)
- `netstat`, `nslookup`, `ping` (general network diagnostics)
- IPv4 static addressing, subnet masks, DNS servers

## Sources Consulted
- Apple `networksetup(8)` man page — https://ss64.com/mac/networksetup.html and Apple developer documentation
- Apple `ifconfig(8)` man page — https://ss64.com/mac/ifconfig.html
- Apple `dscacheutil(1)` man page — https://ss64.com/mac/dscacheutil.html
- Apple Support — "Reset the DNS cache in macOS" (uses `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`) — https://support.apple.com/guide/mac-help/
- Apple Support — Change TCP/IP settings on Mac (System Settings → Network → Details → TCP/IP) — https://support.apple.com/guide/mac-help/change-tcp-ip-settings-mh14129/mac
- BSD `route(8)` man page (`route add default <gateway>` syntax)

## Issues Found
No technical issues found.

All command syntax is correct:
- `networksetup -setmanual <service> <ip> <subnet> <router>` matches the documented signature.
- `networksetup -setdnsservers`, `-getinfo`, `-getdnsservers`, `-setdhcp`, `-listallnetworkservices` are all valid subcommands.
- `ifconfig en0 <ip> netmask <mask>` and `ifconfig en0 alias <ip> <mask>` / `-alias <ip>` are correct BSD ifconfig usage.
- `route add default <gateway>` is the correct BSD route syntax (note: macOS does not use `-net default` style).
- `sudo dscacheutil -flushcache` followed by `sudo killall -HUP mDNSResponder` is Apple's documented DNS cache flush procedure for modern macOS (10.10.4+).
- GUI navigation (System Settings → Network → Details → TCP/IP → Configure IPv4 → Manually) is accurate for macOS Ventura (13) and later.

## Review Notes
- `ifconfig` is technically deprecated in favor of `networksetup` and the configd-based tooling on macOS, but it still works and remains the standard way to make non-persistent runtime changes. The post correctly frames `ifconfig` as temporary and recommends `networksetup` for persistence.
- On macOS, `ifconfig` changes do persist for the *current* boot session but are not written to the persistent network configuration database, so they are lost on reboot — the post's wording ("lost after reboot") is accurate.
- The `killall -HUP mDNSResponder` step is required on modern macOS (10.10.4+) in addition to `dscacheutil -flushcache`; the post correctly includes both.
- `nslookup` is still shipped with macOS but Apple's preferred modern replacement is `dig` (from bind-utils) or `host`. Using `nslookup` for a quick test is fine.
- The interface name `en0` is the typical Wi-Fi interface on Apple Silicon and most Intel Macs, but on some configurations (e.g., MacBooks with USB-C Ethernet adapters connected) the numbering may shift. The post's "typically Wi-Fi" qualifier is appropriate.
