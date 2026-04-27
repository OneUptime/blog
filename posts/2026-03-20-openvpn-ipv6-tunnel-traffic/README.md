# How to Configure OpenVPN for IPv6 Tunnel Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenVPN, IPv6, VPN, Tunnel, Traffic Routing, Network Security

Description: A guide to configuring OpenVPN to carry IPv6 traffic through an IPv4 VPN tunnel, enabling IPv6 connectivity for clients without native IPv6 access.

OpenVPN can tunnel IPv6 traffic inside an IPv4 VPN connection. This is useful when clients only have IPv4 connectivity but need access to IPv6-only services, or when you want to route all IPv6 traffic through a controlled exit point.

## Architecture: IPv6 over IPv4 Tunnel

```text
Client (IPv4 only)   ←→   OpenVPN Tunnel (IPv4)   ←→   Server (IPv4 + IPv6)
     |                          tun0                          |
     | IPv6 traffic encapsulated inside IPv4 UDP tunnel       |
     |                                                  IPv6 Internet
```

## Server Configuration for IPv6 over IPv4 Tunnel

```ini
# /etc/openvpn/server.conf

port 1194
proto udp          # IPv4 transport (server may only have IPv4 Internet)
dev tun

ca ca.crt
cert server.crt
key server.key
dh dh.pem

# IPv4 tunnel addresses

server 10.8.0.0 255.255.255.0

# IPv6 addresses inside the tunnel (server gets ::1, clients get ::2, ::3, etc.)
server-ipv6 fd00:abcd:1::/64

# Push IPv6 default route to clients (all IPv6 traffic through tunnel)
push "route-ipv6 ::/0"

# Push DNS that resolves IPv6
push "dhcp-option DNS6 2606:4700:4700::1111"

keepalive 10 120
persist-key
persist-tun
```

### Enable IPv6 Forwarding and NAT on Server

```bash
# Allow IPv6 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# NAT IPv6 traffic from tunnel clients to Internet
# (Server uses its public IPv6 as source)
sudo ip6tables -t nat -A POSTROUTING \
  -s fd00:abcd:1::/64 \
  ! -d fd00:abcd:1::/64 \
  -j MASQUERADE

# Allow forwarding for tunnel traffic
sudo ip6tables -A FORWARD -i tun0 -j ACCEPT
sudo ip6tables -A FORWARD -o tun0 -j ACCEPT
```

## Client Configuration

```ini
# /etc/openvpn/client.conf

client
dev tun
proto udp          # IPv4 transport to connect to server

remote vpn-server.example.com 1194

resolv-retry infinite
nobind

ca ca.crt
cert client.crt
key client.key

# Enable IPv6 tunnel support
tun-ipv6

pull
verb 3
```

## Verify IPv6 Traffic Through Tunnel

```bash
# After connecting, verify IPv6 address in tunnel
ip -6 addr show tun0
# Should show fd00:abcd:1::X address

# Check IPv6 default route goes through tunnel
ip -6 route show default
# Should show: default via fd00:abcd:1::1 dev tun0

# Test IPv6 connectivity through tunnel
ping6 -c 3 2001:4860:4860::8888    # Google DNS

# Verify exit IP is server's IPv6 address
curl -6 https://ifconfig.co
```

## Routing Specific IPv6 Prefixes Through VPN

Instead of routing all IPv6 traffic, route only specific prefixes:

```ini
# Server config: push specific routes
push "route-ipv6 2001:db8:1::/48"
push "route-ipv6 fd00:abcd:2::/64"
```

## Script Hooks for IPv6 Route Management

OpenVPN supports scripts that run when the tunnel connects:

```bash
# /etc/openvpn/up.sh - Add IPv6 routes when tunnel comes up
#!/bin/bash
ip -6 route add 2001:db8::/32 dev $dev

# /etc/openvpn/down.sh - Remove routes when tunnel goes down
#!/bin/bash
ip -6 route del 2001:db8::/32 dev $dev
```

```ini
# Add to server.conf
script-security 2
up /etc/openvpn/up.sh
down /etc/openvpn/down.sh
```

## Troubleshooting IPv6 Tunnel Traffic

```bash
# Check if IPv6 packets are arriving at tunnel interface
sudo tcpdump -i tun0 -n ip6

# Check if IPv6 forwarding is enabled on server
cat /proc/sys/net/ipv6/conf/all/forwarding

# Verify NAT rules are in place
sudo ip6tables -t nat -L -n -v

# Test IPv6 routing from server itself
ping6 2001:4860:4860::8888   # Should succeed
curl -6 https://ifconfig.co   # Should show server's IPv6
```

Tunneling IPv6 over IPv4 OpenVPN provides IPv6 connectivity to clients that only have IPv4 Internet access, and ensures IPv6 traffic uses the same controlled exit point as IPv4 traffic - preventing IPv6 from bypassing your VPN.
