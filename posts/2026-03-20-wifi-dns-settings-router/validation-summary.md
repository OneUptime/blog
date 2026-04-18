# Validation Summary: How to Configure IPv4 DNS Settings for WiFi Clients on a Router

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DHCP (RFC 2131 / RFC 2132)
- DNS resolution via DHCP option 6
- OpenWrt UCI configuration (/etc/config/dhcp)
- ISC DHCP server (dhcpd.conf)
- dnsmasq (caching resolver, split-DNS, DHCP)
- cloudflared (DNS-over-HTTPS proxy)
- NetworkManager / nmcli (Linux)
- macOS networksetup
- Windows ipconfig
- nslookup / scutil

## Sources Consulted
- OpenWrt DHCP configuration guide: https://openwrt.org/docs/guide-user/base-system/dhcp_configuration
- ISC DHCP 4.4 manual pages: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- dnsmasq man page / ArchWiki: https://wiki.archlinux.org/title/Dnsmasq
- RFC 2132 (DHCP Options — option 6 is DNS)
- RFC 3397 (DNS Domain Search List — option 119)
- Red Hat nmcli documentation
- Apple networksetup(8) manual
- Cloudflare cloudflared proxy-dns documentation

## Issues Found
No technical issues found.

Specifically verified:
- OpenWrt `list dhcp_option '6,8.8.8.8,8.8.4.4'` is correct per OpenWrt docs (comma-separated IPs following the option number are passed through to dnsmasq's `--dhcp-option`).
- ISC dhcpd.conf `option domain-search` with comma-separated quoted domains is valid in ISC DHCP 4.x+.
- dnsmasq split-DNS syntax `server=/domain/ip` and non-standard port syntax `server=ip#port` are correct.
- `cloudflared proxy-dns --port 5053` is correct command/flag syntax.
- `nmcli connection modify ... ipv4.dns "1.1.1.1 8.8.8.8"` (space-separated DNS servers in a quoted string) is correct.
- `networksetup -setdnsservers "Wi-Fi" 1.1.1.1 8.8.8.8` is correct macOS syntax.
- Verification commands (`ipconfig /all`, `nmcli dev show`, `scutil --dns`) all produce the described output.

## Review Notes
- Cloudflare has signaled future deprecation of the standalone `cloudflared proxy-dns` feature in favor of their WARP-based tooling, but the command remains functional at the time of review. Readers deploying this in production should monitor Cloudflare release notes.
- The `.local` TLD used in examples (e.g., `fileserver.local`) overlaps with mDNS (RFC 6762). On networks where mDNS is in use, this can cause resolution ambiguity; many organizations prefer a non-conflicting TLD like `.internal` or `.home.arpa` (RFC 8375). The post's dnsmasq `local=/local/` directive partially mitigates this by preventing upstream forwarding.
- `bind-interfaces` in combination with `listen-address` is the correct pattern shown, but on some systems `bind-dynamic` may be preferred if interfaces come and go.
- The `echo "nameserver 1.1.1.1" > /etc/resolv.conf` example will be overwritten on systems using systemd-resolved, NetworkManager, or resolvconf — the post does mention the NetworkManager alternative, which is the more robust approach on modern Linux distributions.
