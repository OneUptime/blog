# Validation Summary: How to Configure IPv4 VPN on pfSense with WireGuard

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- pfSense
- WireGuard
- IPv4
- Firewall rules
- Network Address Translation (NAT)

## Sources Consulted
- Netgate pfSense documentation, WireGuard overview: https://docs.netgate.com/pfsense/en/latest/vpn/wireguard/
- Netgate pfSense documentation, WireGuard remote access VPN configuration example: https://docs.netgate.com/pfsense/en/latest/recipes/wireguard-ra.html
- Netgate pfSense documentation, WireGuard settings: https://docs.netgate.com/pfsense/en/latest/vpn/wireguard/settings.html
- Netgate pfSense documentation, Assign a WireGuard interface: https://docs.netgate.com/pfsense/en/latest/vpn/wireguard/assign.html
- Netgate pfSense documentation, WireGuard and rules / NAT: https://docs.netgate.com/pfsense/en/latest/vpn/wireguard/rules.html
- Netgate pfSense documentation, Outbound NAT: https://docs.netgate.com/pfsense/en/latest/nat/outbound.html
- Netgate pfSense release notes, 21.02.2 / 2.5.1: https://docs.netgate.com/pfsense/en/latest/releases/21-02-2_2-5-1.html
- Netgate pfSense release notes, 2.5.2: https://docs.netgate.com/pfsense/en/latest/releases/2-5-2.html
- WireGuard official quick start: https://www.wireguard.com/quickstart/

## Issues Found
- The post said WireGuard was built in to pfSense 2.5.2+ and implied older versions used the package. I corrected this to match Netgate documentation: WireGuard is available as an add-on package on pfSense CE 2.5.2+ and pfSense Plus 21.05+.
- The interface assignment step referred to `wg0`. I corrected this to `tun_wg0` / `tun_wg<number>`, which is how pfSense presents WireGuard interfaces for assignment.
- The post omitted the pfSense warning about automatic default gateway selection before assigning the WireGuard interface. I added that note because Netgate documents it as an important routing safeguard.
- The NAT section said to switch to Hybrid or Manual outbound NAT and add a rule. I corrected this so it reflects current pfSense behavior: Automatic outbound NAT already handles assigned WireGuard interfaces, while Hybrid or Manual modes require a manual rule.
- The final sentence said clients "will receive" a VPN IP, which is inaccurate for WireGuard. I changed it to say clients use the VPN IPs you assign, since WireGuard does not hand out addresses dynamically.
- I added the missing `Enable`, `Dynamic Endpoint`, and current `Interface Addresses` details so the instructions match the documented pfSense WireGuard workflow more closely.

## Review Notes
- The client example is a full-tunnel configuration because it uses `AllowedIPs = 0.0.0.0/0`. That is technically valid, but it routes all IPv4 traffic through pfSense rather than only internal subnets.
- Exact button labels and minor UI wording can vary slightly across pfSense releases, but the corrected steps match Netgate's current documentation model for the add-on package.
