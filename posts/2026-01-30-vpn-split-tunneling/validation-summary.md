# Validation Summary: How to Implement VPN Split Tunneling

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Linux networking (iproute2: `ip route`, `ip rule`, `ip netns`, `ip link`)
- iptables (mangle and nat tables, MARK, MASQUERADE, cgroup match)
- Linux cgroups (cgroup v1 `net_cls` controller)
- Network namespaces and veth pairs
- macOS networking (`scutil`, `netstat`, `route`)
- Windows PowerShell VPN cmdlets (`Set-VpnConnection`, `Add-VpnConnectionRoute`, `Remove-VpnConnectionRoute`, `Get-VpnConnectionRoute`)
- Windows Always-On VPN traffic filters (ProfileXML / VPNv2 CSP)
- OpenVPN server and client configuration (`push route`, `route-nopull`, `redirect-gateway`)
- WireGuard configuration (`AllowedIPs`, `PersistentKeepalive`)
- dnsmasq split-DNS configuration
- Python 3 (`subprocess`, `collections.defaultdict`, `datetime`)
- NetworkManager dispatcher scripts

## Sources Consulted
- iproute2 manual pages (`ip-route(8)`, `ip-rule(8)`, `ip-netns(8)`)
- iptables manual pages and netfilter documentation
- OpenVPN 2.x manual (https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/)
- WireGuard documentation (https://www.wireguard.com/quickstart/)
- Microsoft VpnClient PowerShell module documentation (`Set-VpnConnection`, `Add-VpnConnectionRoute`)
- Microsoft Always-On VPN ProfileXML / VPNv2 CSP documentation
- macOS `route(8)` and `scutil(8)` manual pages
- dnsmasq manual (https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html)
- Linux kernel cgroup v1 documentation for `net_cls`

## Issues Found
- **Firewall script — unreachable LOG rule**: In the `setup_firewall` function, the `iptables -A OUTPUT -j LOG --log-prefix "SPLIT-TUNNEL-DROP: "` rule was placed after `iptables -A OUTPUT -j ACCEPT`. Since `-j ACCEPT` terminates traversal of the OUTPUT chain, the LOG rule was unreachable, and packets that were dropped earlier in the chain (via `-j DROP`) also never reached LOG. Fixed by moving the LOG rule into the per-network loop *before* the DROP rule so non-VPN corporate traffic is logged before being dropped.

## Review Notes
- **cgroup v1 vs v2**: The application-based split tunneling section uses the `net_cls` cgroup controller (`cgcreate -g net_cls:/...`, `/sys/fs/cgroup/net_cls/...`, `iptables -m cgroup --cgroup <classid>`). This is cgroup v1 syntax. Many modern distributions (Ubuntu 22.04+, Fedora 31+, recent Debian) now default to the cgroup v2 unified hierarchy where `net_cls` is not available. On those systems, `iptables -m cgroup --path <cgroup-path>` against a cgroup v2 path is the equivalent. The current example is still valid on cgroup v1 / hybrid systems but readers on cgroup v2-only hosts will need to adapt it.
- **macOS interface detection**: The `get_vpn_interface` function parses `scutil --nc list` and returns the field between double quotes, which is the VPN *service name* (e.g. "Corporate VPN"), not the underlying interface (e.g. `utun0`/`ppp0`). The subsequent `netstat -rn | grep "$VPN_IF"` step is therefore fragile and will not reliably locate the VPN gateway. The example is illustrative and users will typically need to adapt it (e.g. discover the `utunN` interface via `ifconfig` or by inspecting routes added when the VPN connects).
- **Windows Always-On VPN registry method**: The `HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Network` path with a `VPNTrafficFilters` value is not the canonical mechanism for configuring Always-On VPN traffic filters. In production, traffic filters are typically delivered through the VPNv2 CSP via MDM (Intune) or via PowerShell with a ProfileXML containing `<TrafficFilter>` blocks. The XML payload shown is structurally consistent with ProfileXML traffic filters, but the registry-write delivery method shown is illustrative rather than a Microsoft-documented mechanism.
- **OpenVPN cipher directives**: `cipher AES-256-GCM` and `auth SHA256` are valid and continue to work. In OpenVPN 2.5+, the recommended directive for the data channel is `data-ciphers` (a colon-separated negotiation list), with `cipher` acting as a fallback. The current configuration is still functional and widely seen in the wild.
- **OpenVPN `dh dh2048.pem`**: Optional in modern OpenVPN if using ECDHE; the directive is still accepted. Not an error.
- **Python script minor cruft**: `import re` is unused, and `self.traffic_stats` is initialized but never read in `print_report`. Both are harmless and do not affect correctness, so left as-is.
- **dnsmasq `/etc/resolv.conf` overwrite**: Writing `nameserver 127.0.0.1` directly to `/etc/resolv.conf` will be reverted by NetworkManager / systemd-resolved on most modern distributions. Users should integrate with the active resolver manager (e.g. `resolvectl dns`, NetworkManager `dns=dnsmasq`, or `systemd-resolved` configuration) for a persistent setup. The example reads as a quick illustration and is acceptable in that context.
- **`ip route ... table main`** in the basic Linux script: `main` is the default table, so the explicit `table main` is redundant but not incorrect.
