# Validation Summary: How to Prevent IPv6 VPN Leaks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- VPNs
- Linux firewalling with `ip6tables`
- Linux networking with `iproute2`
- Linux `sysctl`
- OpenVPN
- WireGuard
- NetworkManager / `nmcli`
- `curl`
- `ping`

## Sources Consulted
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- OpenVPN 2.6 man page: https://build.openvpn.net/man/openvpn-2.6/openvpn.8.html
- WireGuard official documentation: https://www.wireguard.com/
- NetworkManager IPv6 settings reference: https://www.networkmanager.dev/docs/api/1.32.8/settings-ipv6.html
- NetworkManager `nmcli` settings reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.11/networking/ip-sysctl.html
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ip6tables(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip6tables.8.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `ping(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- BrowserLeaks IP test page (URL validation): https://browserleaks.com/ip
- ifconfig.co (URL validation): https://ifconfig.co/
- icanhazip.com (URL validation): https://icanhazip.com/

## Issues Found
- The introduction said an IPv6 leak reveals the real IPv6 address to every site visited. That was too broad; it now correctly says this can reveal the address to IPv6-capable sites.
- The `ip6tables` example appended a drop rule before the exceptions, duplicated the drop rule, and included an unrelated `INPUT` rule. I replaced it with correctly ordered `OUTPUT` rules that allow loopback and the VPN interface before dropping other IPv6 egress.
- The persistent `sysctl` example used shell redirection without privilege escalation. I changed it to `sudo tee -a /etc/sysctl.conf >/dev/null << 'EOF'` so it works as written.
- The blackhole-route explanation incorrectly implied VPN routes would win because of a lower metric. I corrected the note to explain that more specific IPv6 routes can still take precedence.
- The OpenVPN dual-stack example used `route-ipv6 ::/0` without showing the corresponding IPv6 tunnel setup. I replaced it with a current OpenVPN example using `redirect-gateway ipv6` plus server-side `server-ipv6` and `push "redirect-gateway ipv6"`.
- The OpenVPN kill-switch script would have blocked loopback traffic because it only inserted a broad non-`tun0` drop rule. I aligned it with the corrected firewall approach, updated the removal commands to match, and separated the two script snippets so each file starts with a valid shebang.
- The NetworkManager example targeted `"VPN Connection"`, which is misleading for leak prevention because the setting that prevents direct IPv6 exposure belongs on the underlying non-VPN connection profile. I changed the example and wording accordingly, and added a reconnect command so the profile change is actually applied.
- The post linked `https://browserleaks.com/ipv6`, which no longer resolves to the IPv6 leak test. I updated it to `https://browserleaks.com/ip`, which currently exposes the IPv6 leak result.
- The manual test used `https://ipv6.icanhazip.com`; I changed it to `https://icanhazip.com` with `curl -6`, which currently resolves correctly.
- The verification command used `ping6`; I updated it to the current documented `ping -6` form and aligned the example output note with that command.

## Review Notes
- The `ip6tables` syntax remains valid on current Linux systems, though many distributions now run it through the nftables compatibility backend.
- The OpenVPN `server-ipv6 2001:db8:100::/64` value is an example documentation prefix, not a routable production prefix.
