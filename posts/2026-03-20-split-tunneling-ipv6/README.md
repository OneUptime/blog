# How to Configure Split Tunneling for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VPN, Split Tunneling, Routing, WireGuard, OpenVPN

Description: A guide to configuring IPv6 split tunneling in WireGuard and OpenVPN, routing specific IPv6 prefixes through the VPN while allowing other IPv6 traffic to go direct.

IPv6 split tunneling routes only specific IPv6 prefixes through the VPN tunnel while allowing other IPv6 traffic to flow directly to the Internet. This is useful when you need access to internal IPv6 resources through the VPN without routing all IPv6 through it.

## Split Tunneling Concept

```text
Internal IPv6 traffic → VPN tunnel → Internal network
Public IPv6 traffic   → Direct to Internet (not through VPN)
```

## WireGuard IPv6 Split Tunnel

In WireGuard, `AllowedIPs` defines what goes through the tunnel:

```ini
# /etc/wireguard/wg0.conf (split tunnel)

[Interface]
Address = 10.0.0.2/32
Address = fd42:1234:5678:1::2/128
PrivateKey = <private-key>

# No DNS override - use system DNS for public names

[Peer]
PublicKey = <server-public-key>
Endpoint = vpn.example.com:51820

# Only route internal prefixes through VPN
# Includes internal IPv4, internal IPv6 ULA, and an example office IPv6 prefix
AllowedIPs = 10.0.0.0/8, fd42:1234:5678::/48, 2001:db8:100::/48

# Public IPv6 (::/0) is NOT included - goes direct
```

## Calculating Split Tunnel AllowedIPs

To route IANA's assignable global unicast IPv6 block while leaving local and special-use IPv6 outside the tunnel:

```ini
# Install wireguard-tools for allowed-ips calculator
# Or use the online calculator at https://www.procustodibus.com/blog/2021/03/wireguard-allowedips-calculator/

# Route global unicast IPv6 through VPN, while leaving local/special-use IPv6 direct
# For true "everything except specific prefixes", calculate the exact prefix set.
# Instead of ::/0, use:
# 2000::/3  - IANA assignable global unicast address block
# (excludes fc00::/7 - unique local, fe80::/10 - link-local, etc.)

AllowedIPs = 2000::/3    # Global unicast IPv6 through VPN
```

## OpenVPN IPv6 Split Tunnel

```ini
# /etc/openvpn/client.conf

client
dev tun
remote vpn.example.com 1194 udp

ca ca.crt
cert client.crt
key client.key

# Do NOT use redirect-gateway for IPv6
# Instead, specify exact prefixes to route through VPN
route-ipv6 2001:db8:100::/48
route-ipv6 fd42:1234:5678::/48

pull
```

Server configuration to push routes to clients:

```ini
# /etc/openvpn/server.conf
# Push specific IPv6 routes to clients
push "route-ipv6 2001:db8:100::/48"
push "route-ipv6 fd42:1234:5678::/48"

# Do NOT push: "route-ipv6 ::/0"   (would be full tunnel)
```

## Routing IPv6 Based on Domain

For more sophisticated split tunneling based on domain names:

```bash
# Use DNS-based routing with systemd-resolved or dnsmasq
# Route DNS queries for internal domains to internal DNS
# Those domains return internal IPv6 addresses → routes through VPN

# Configure the VPN link with internal DNS and route-only domains
# Replace wg0 with your VPN interface (for example, tun0 for OpenVPN)
resolvectl dns wg0 fd42:1234:5678::53
resolvectl domain wg0 '~internal.example.com' '~corp.example.com'
resolvectl default-route wg0 false
```

## Testing Split Tunnel Configuration

```bash
# Verify internal IPv6 goes through VPN
traceroute6 fd42:1234:5678::10
# First hop should be VPN gateway

# Verify public IPv6 goes direct
traceroute6 2001:4860:4860::8888
# First hop should be your local gateway (not VPN)

# Check routing table shows split routes
ip -6 route show | grep wg0    # VPN routes
ip -6 route show | grep eth0   # Direct routes
```

## Dynamic Split Tunnel with Route Injection

```bash
#!/bin/bash
# /etc/wireguard/wg-up.sh

# Use this when wg-quick automatic routes are disabled with Table = off

# Add internal IPv6 routes when VPN comes up
ip -6 route add 2001:db8:100::/48 dev wg0
ip -6 route add fd42:1234:5678::/48 dev wg0

# wg-quick config hooks:
# Table = off
# PostUp = /etc/wireguard/wg-up.sh
# PreDown = /etc/wireguard/wg-down.sh
```

## Security Considerations for IPv6 Split Tunneling

| Risk | Mitigation |
|---|---|
| Internal resource exposure | Firewall controls on VPN server |
| DNS leaks for internal names | Use internal DNS only for internal domains |
| IPv6 direct routing bypasses monitoring | Log direct IPv6 separately |
| Misconfiguration allows full bypass | Test all routes after configuration |

Split tunneling reduces VPN load and improves performance for public content while keeping internal IPv6 resources accessible through the secure tunnel - the key is accurately defining which prefixes should be routed through the VPN.
