# Validation Summary: How to Push IPv4 Routes and DNS Settings to OpenVPN Clients

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenVPN (server-side configuration)
- IPv4 routing
- DNS (dhcp-option DNS, DOMAIN, DOMAIN-SEARCH)
- DHCP options (NTP, WINS)
- Client Config Directory (CCD)
- Linux client verification (journalctl, ip route, /etc/resolv.conf)
- Windows client verification (route print, ipconfig)

## Sources Consulted
- OpenVPN 2.6 manual page: https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/
- OpenVPN community wiki: https://community.openvpn.net/openvpn/wiki
- OpenVPN HOWTO (push, redirect-gateway, dhcp-option): https://openvpn.net/community-resources/how-to/
- OpenVPN source/docs on DOMAIN-SEARCH option (added in 2.5)
- Microsoft `route` command reference (route print -4): https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/route_ws2008
- net30 topology pair convention (valid pairs at n*4+1 / n*4+2)

## Issues Found
1. **`dhcp-option DOMAIN-SEARCH` with multiple domains on one line** — The original post had `push "dhcp-option DOMAIN-SEARCH corp.example.com internal.example.com"`. Per OpenVPN documentation, DOMAIN-SEARCH accepts a single domain name per directive; the directive must be repeated to add multiple search domains. Fixed by splitting into two separate `push "dhcp-option DOMAIN-SEARCH ..."` lines.
2. **Invalid net30 IP pair in `ifconfig-push`** — The original post used `ifconfig-push 10.8.0.10 10.8.0.11`. With OpenVPN's default net30 topology, the second argument is the peer endpoint IP, and the two addresses must form a valid /30 pair following the (n*4+1, n*4+2) convention: (.1,.2), (.5,.6), (.9,.10), (.13,.14), etc. The IP 10.8.0.11 is actually the broadcast address of the /30 containing 10.8.0.10. Fixed to use the valid pair `10.8.0.9 10.8.0.10`.

## Review Notes
- The post does not explicitly state which `topology` mode (`net30` vs `subnet`) is in use. The default is still `net30` in many distributions, though `subnet` is recommended for new setups. With `topology subnet`, `ifconfig-push` takes a netmask as the second argument (e.g., `ifconfig-push 10.8.0.10 255.255.255.0`). The corrected example assumes net30 topology, which is the historical default.
- `journalctl -u openvpn -f` works on distributions that ship the legacy `openvpn.service` unit. On modern systemd-based distributions (Debian 10+, Ubuntu 18.04+, RHEL 8+), the unit is typically `openvpn-server@<config-name>.service`. Readers may need to adjust the unit name accordingly.
- The `def1` explanation (adding `0.0.0.0/1` and `128.0.0.0/1`) is technically correct.
- `route print -4` on Windows is a valid flag for filtering IPv4 routes.
- All `dhcp-option` keywords used (DNS, DOMAIN, DOMAIN-SEARCH, NTP, WINS) are valid OpenVPN dhcp-option types.
