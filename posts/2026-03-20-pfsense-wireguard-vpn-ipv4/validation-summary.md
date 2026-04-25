# Validation Summary: How to Configure WireGuard VPN for IPv4 on pfSense

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- pfSense
- WireGuard
- IPv4
- VPN remote access
- Firewall rules and routing

## Sources Consulted
- Netgate pfSense WireGuard overview: https://docs.netgate.com/pfsense/en/latest/vpn/wireguard/index.html
- Netgate WireGuard remote access recipe: https://docs.netgate.com/pfsense/en/latest/recipes/wireguard-ra.html
- Netgate WireGuard settings reference: https://docs.netgate.com/pfsense/en/latest/vpn/wireguard/settings.html
- Netgate WireGuard interface assignment: https://docs.netgate.com/pfsense/en/latest/vpn/wireguard/assign.html
- Netgate WireGuard rules and NAT guidance: https://docs.netgate.com/pfsense/en/latest/vpn/wireguard/rules.html
- Netgate Package Manager documentation: https://docs.netgate.com/pfsense/en/latest/packages/manager.html
- Netgate 21.02.2 / 2.5.1 release notes (WireGuard base-system removal and package availability): https://docs.netgate.com/pfsense/en/latest/releases/21-02-2_2-5-1.html
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- WireGuard `wg(8)` manual: https://man7.org/linux/man-pages/man8/wg.8.html

## Issues Found
- The introduction and install step said WireGuard was built into pfSense 2.5+ and only needed as a package on pfSense earlier than 2.6. This is outdated. I corrected the post to reflect current Netgate guidance: on current pfSense releases, WireGuard is installed from the package manager, and the earlier base-system implementation was removed after pfSense Plus 21.02-p1 / pfSense CE 2.5.0.
- The package installation path used `System > Package Manager > Available Packages`. Current pfSense documentation uses `System > Packages > Available Packages`, so I updated the navigation path.
- The peer creation step used an imprecise navigation path and omitted the dynamic-endpoint setting that matches the road-warrior scenario. I updated it to `VPN > WireGuard > Peers > Add Peer` and added `Dynamic Endpoint: checked`.
- The interface assignment step omitted Netgate’s warning about automatic default gateway selection before assigning a WireGuard interface. I added that caution because leaving the default gateway on automatic can cause pfSense to prefer the WireGuard interface unexpectedly.
- The client example used `10.6.0.2/32`, `DNS = 192.168.1.1`, and a split-tunnel `AllowedIPs` example that did not include the tunnel IP. I updated the example to align with Netgate’s current remote-access recipe by using the tunnel subnet mask on the client address, the tunnel IP for DNS, and a split-tunnel example that includes the tunnel IP plus the LAN subnet.
- The verification commands used `wg show wg0`. On pfSense, the package-managed interface name exposed in the GUI is `tun_wg<number>`, so I corrected the example to `wg show tun_wg0` and `wg show tun_wg0 latest-handshakes`.

## Review Notes
- The post is technically salvageable and now accurate for current pfSense documentation.
- For full-tunnel client Internet access, default Automatic Outbound NAT on pfSense typically covers remote access VPN networks. If a firewall is using Manual Outbound NAT, additional NAT rules may still be required.
