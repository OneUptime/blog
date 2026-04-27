# How to Configure OpenVPN with Dual-Stack Client Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenVPN, IPv6, Dual-Stack, VPN, Client Configuration, Network

Description: A guide to configuring OpenVPN for dual-stack clients that can connect using either IPv4 or IPv6 and receive both IPv4 and IPv6 tunnel addresses.

A dual-stack OpenVPN setup allows clients to connect over IPv4 or IPv6, and receive both IPv4 and IPv6 tunnel addresses once connected. This is the most flexible configuration for modern networks where both address families are common.

## Dual-Stack Server Configuration

```ini
# /etc/openvpn/server.conf

# Listen on both IPv4 and IPv6 simultaneously

# 'udp6' binds to :: which accepts both IPv4 and IPv6 connections
proto udp6
port 1194
dev tun

# TLS
ca ca.crt
cert server.crt
key server.key
dh dh.pem

# IPv4 tunnel addresses
server 10.8.0.0 255.255.255.0

# IPv6 tunnel addresses
server-ipv6 fd00:abcd:1::/64

# Push both IPv4 and IPv6 routes
push "redirect-gateway def1"          # Route IPv4 default through VPN
push "route-ipv6 ::/0"               # Route IPv6 default through VPN

# Push DNS servers (both address families)
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS6 2001:4860:4860::8888"

# IPv6 routing
tun-ipv6

keepalive 10 120
persist-key
persist-tun
status /var/log/openvpn-status.log
verb 3
```

## Client Configuration for Dual-Stack

```ini
# /etc/openvpn/client.conf

client
dev tun
tun-ipv6

# The client will try the hostname which may resolve to IPv4 or IPv6
# Use 'remote' entries for both address families with preference
remote vpn.example.com 1194 udp6       # Try IPv6 first
remote vpn.example.com 1194 udp         # Fall back to IPv4

# Connection behavior
connect-retry 5
connect-retry-max 3
resolv-retry infinite
nobind

# TLS
ca ca.crt
cert client.crt
key client.key

pull
verb 3
```

## Separate IPv4 and IPv6 Listener Ports

For more explicit control, run two OpenVPN instances:

```bash
# Start IPv4 listener on port 1194
openvpn --config /etc/openvpn/server-ipv4.conf --daemon

# Start IPv6 listener on port 1194 (separate config)
openvpn --config /etc/openvpn/server-ipv6.conf --daemon
```

```ini
# server-ipv4.conf
proto udp
local 192.0.2.1     # Bind to specific IPv4 address
port 1194
server 10.8.0.0 255.255.255.0
server-ipv6 fd00:abcd:1::/64

# server-ipv6.conf
proto udp6
local 2001:db8::1     # Bind to specific IPv6 address
port 1194
server 10.9.0.0 255.255.255.0
server-ipv6 fd00:abcd:2::/64
```

## Per-Client IPv6 Address Assignment

Assign specific IPv6 addresses to specific clients:

```bash
# Create client-specific config directory
mkdir -p /etc/openvpn/ccd

# Create client config file (filename = CN from client certificate)
cat > /etc/openvpn/ccd/client1 << 'EOF'
# Assign specific IPv4 and IPv6 addresses
ifconfig-push 10.8.0.10 10.8.0.9
ifconfig-ipv6-push fd00:abcd:1::10/64
EOF
```

```ini
# Add to server.conf
client-config-dir /etc/openvpn/ccd
```

## Monitoring Dual-Stack Connections

```bash
# View connected clients with their IP addresses
sudo cat /var/log/openvpn-status.log

# Real-time monitoring
sudo tail -f /var/log/openvpn-status.log

# Check which address family clients connected over
sudo journalctl -u openvpn@server | grep "TCP\|UDP" | grep "Connected"
```

## Testing Dual-Stack Connectivity

```bash
# After connecting, verify both addresses are assigned
ip addr show tun0

# Test IPv4 through tunnel
ping -c 3 8.8.8.8
curl -4 https://ifconfig.co

# Test IPv6 through tunnel
ping6 -c 3 2001:4860:4860::8888
curl -6 https://ifconfig.co

# Verify both use VPN's exit IP
```

## Happy Eyeballs Behavior

Modern clients use "Happy Eyeballs" (RFC 8305) to connect to VPN:
- If the VPN server has both A and AAAA records, the client tries both simultaneously
- Whichever connects first is used
- To prefer IPv6: ensure the IPv6 path has lower latency

OpenVPN's dual-stack support ensures that clients on modern networks receive full IPv4 and IPv6 connectivity through the VPN tunnel regardless of which protocol they used to connect.
