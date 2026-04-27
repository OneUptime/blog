# How to Configure OpenVPN with IPv6 Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenVPN, IPv6, VPN, Network Configuration, Dual-Stack, Tunneling

Description: A guide to configuring OpenVPN server and client with IPv6 support, enabling both IPv4 and IPv6 traffic through an OpenVPN tunnel.

OpenVPN supports IPv6 in several ways: as a transport protocol (connecting to the VPN server over IPv6), as a tunnel protocol (carrying IPv6 traffic inside the tunnel), or both. This guide covers enabling complete IPv6 support in OpenVPN.

## Prerequisites

- OpenVPN 2.3+ (IPv6 support improved in 2.4+)
- Linux server with an IPv6 address
- Verify IPv6 support: `openvpn --version | grep -i ipv6`

## Server Configuration

### /etc/openvpn/server.conf

```ini
# Basic server settings

port 1194
proto udp6        # Listen on both IPv4 and IPv6 (udp6 listens on :: by default)
dev tun

# TLS configuration
ca ca.crt
cert server.crt
key server.key
dh dh.pem

# IPv4 tunnel network
server 10.8.0.0 255.255.255.0

# IPv6 tunnel network (assign a /64 from your prefix)
server-ipv6 2001:db8:0:1::/64

# Push IPv6 default route to clients
push "route-ipv6 ::/0"

# Push IPv6 DNS server
push "dhcp-option DNS 2001:4860:4860::8888"

# Logging and persistence
keepalive 10 120
persist-key
persist-tun
status openvpn-status.log
verb 3
```

### Enable IPv6 Forwarding on Server

```bash
# Enable IPv6 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Make persistent
echo "net.ipv6.conf.all.forwarding=1" >> /etc/sysctl.conf
sudo sysctl -p

# Enable NAT for IPv6 (if not using a routable prefix)
sudo ip6tables -t nat -A POSTROUTING -s 2001:db8:0:1::/64 \
  -o eth0 -j MASQUERADE
```

## Client Configuration

### /etc/openvpn/client.conf

```ini
client
dev tun
proto udp6         # Connect to server over IPv6

# Connect to server's IPv6 address (no brackets in OpenVPN's remote directive)
remote 2001:db8::1 1194

# Or connect via dual-stack hostname (resolves to IPv4 or IPv6)
# remote vpn.example.com 1194

resolv-retry infinite
nobind

ca ca.crt
cert client.crt
key client.key

# Note: tun-ipv6 is auto-enabled in OpenVPN 2.4+ and is only needed
# for older clients that require it explicitly.
tun-ipv6

# Pull IPv6 configuration from server
pull

verb 3
```

## Verifying IPv6 VPN Connection

```bash
# After connecting, check tunnel interface for IPv6 address
ip -6 addr show tun0

# Check IPv6 default route through VPN
ip -6 route show

# Test IPv6 connectivity through VPN
ping6 2001:4860:4860::8888   # Google DNS over IPv6

# Verify your IPv6 address appears as the VPN's IP
curl -6 https://ifconfig.co
```

## Firewall Rules for IPv6 VPN

```bash
# Server-side: allow VPN port (UDP 1194 over IPv6)
sudo ip6tables -A INPUT -p udp --dport 1194 -j ACCEPT

# Allow forwarding for VPN clients
sudo ip6tables -A FORWARD -i tun0 -j ACCEPT
sudo ip6tables -A FORWARD -o tun0 -j ACCEPT

# Allow established connections
sudo ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
```

## Troubleshooting

```bash
# Check OpenVPN logs for IPv6 issues
sudo journalctl -u openvpn@server -f

# Verify server is listening on IPv6
sudo ss -6 -ulnp | grep 1194

# Test connectivity to VPN server over IPv6
nmap -6 -p 1194 -sU 2001:db8::1
```

OpenVPN's native IPv6 support means both the control channel (connecting to the VPN server) and the data channel (routing IPv6 traffic through the tunnel) can use IPv6, enabling full dual-stack or IPv6-only VPN deployments.
