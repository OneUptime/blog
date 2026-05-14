# Validation Summary: How to Set Up Site-to-Site VPN with WireGuard on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- WireGuard
- wg-quick systemd service
- firewalld
- Linux IPv4 routing and IP forwarding
- DHCP option 121 classless static routes

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing networking", WireGuard sections: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_managing_networking/configuring-and-managing-networking.pdf
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld zones manual: https://firewalld.org/documentation/man-pages/firewalld.zones
- firewalld zone options documentation: https://firewalld.org/documentation/zone/options
- Linux ip-route manual: https://www.man7.org/linux/man-pages/man8/ip-route.8.html
- RFC 3442, The Classless Static Route Option for DHCPv4: https://www.rfc-editor.org/rfc/rfc3442
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737

## Issues Found
- The installation step included `sudo dnf install -y epel-release`. Red Hat's RHEL 9 WireGuard documentation installs `wireguard-tools` directly with `dnf install wireguard-tools`; adding `epel-release` is unnecessary for this RHEL 9 procedure and may fail on a stock RHEL system. Removed the `epel-release` command.
- The firewalld example only added `wg0` to the trusted zone while claiming to allow forwarding between the LAN interface and WireGuard. In firewalld, zone handling is based on the ingress interface or source; trusting only `wg0` does not necessarily allow packets entering from the LAN zone to forward to the tunnel. Updated the example to add `wg0` and the local LAN source subnet to the trusted zone, with a note to use the correct subnet on each site.
- The troubleshooting section said `ss -ulnp | grep 51820` checks that both sides can reach each other on UDP 51820. That command only verifies local UDP listening sockets. Updated the comment to say it checks that WireGuard is listening on UDP 51820.

## Review Notes
- The example public addresses `203.0.113.10` and `198.51.100.20` are documentation-only TEST-NET addresses reserved by RFC 5737, which is appropriate for an example but must be replaced in a real deployment.
- The WireGuard configuration keys, `AllowedIPs`, `Endpoint`, `PersistentKeepalive`, `Address`, and `ListenPort` syntax match WireGuard and RHEL 9 `wg-quick` documentation.
- The static route command and DHCP option 121 guidance are technically valid for routing LAN hosts to the remote site.
