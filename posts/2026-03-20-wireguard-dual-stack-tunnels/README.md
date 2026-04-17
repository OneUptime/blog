# How to Configure WireGuard Dual-Stack Tunnels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WireGuard, IPv6, Dual-Stack, VPN, IPv4, Tunneling

Description: A guide to configuring WireGuard tunnels that carry both IPv4 and IPv6 traffic simultaneously, providing complete dual-stack VPN connectivity.

A WireGuard dual-stack tunnel assigns both IPv4 and IPv6 addresses to the tunnel interface and routes traffic for both address families through the same WireGuard peer. This is the standard configuration for modern dual-stack environments.

## Dual-Stack Interface Configuration

```ini
# /etc/wireguard/wg0.conf (server)

[Interface]
# Assign both IPv4 and IPv6 tunnel addresses

Address = 10.0.0.1/24
Address = fd00:abcd::1/64

ListenPort = 51820
PrivateKey = <server-private-key>

# Dual-stack forwarding and NAT
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE
PostUp = ip6tables -A FORWARD -i wg0 -j ACCEPT
PostUp = ip6tables -t nat -A POSTROUTING -s fd00:abcd::/64 -o eth0 -j MASQUERADE
PreDown = iptables -D FORWARD -i wg0 -j ACCEPT
PreDown = iptables -t nat -D POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE
PreDown = ip6tables -D FORWARD -i wg0 -j ACCEPT
PreDown = ip6tables -t nat -D POSTROUTING -s fd00:abcd::/64 -o eth0 -j MASQUERADE

[Peer]
PublicKey = <client-public-key>
# Allow both IPv4 and IPv6 from this client
AllowedIPs = 10.0.0.2/32, fd00:abcd::2/128
```

## Dual-Stack Client Configuration

```ini
# /etc/wireguard/wg0.conf (client)

[Interface]
# Tunnel addresses for both families
Address = 10.0.0.2/24
Address = fd00:abcd::2/64

PrivateKey = <client-private-key>

# Dual-stack DNS
DNS = 8.8.8.8, 2001:4860:4860::8888

[Peer]
PublicKey = <server-public-key>

# Connect over IPv4 or IPv6 (use hostname for dual-stack connection)
Endpoint = vpn.example.com:51820

# Route all traffic (both IPv4 and IPv6) through VPN
AllowedIPs = 0.0.0.0/0, ::/0

PersistentKeepalive = 25
```

## Verify Dual-Stack Tunnel

```bash
# Bring up the tunnel
sudo wg-quick up wg0

# Check both IPv4 and IPv6 addresses
ip addr show wg0

# Check both routing tables
ip route show | grep wg0
ip -6 route show | grep wg0

# Test IPv4 connectivity
ping -c 3 8.8.8.8
curl -4 https://ifconfig.co

# Test IPv6 connectivity
ping -6 -c 3 2001:4860:4860::8888
curl -6 https://ifconfig.co
```

## Selective Routing (Split Tunnel, Dual-Stack)

```ini
# Split tunnel: only internal networks through VPN

[Peer]
PublicKey = <server-public-key>
Endpoint = vpn.example.com:51820

# Internal IPv4
AllowedIPs = 10.0.0.0/8

# Internal IPv6
AllowedIPs = fd00:abcd::/48

# Separate by comma
AllowedIPs = 10.0.0.0/8, fd00:abcd::/48
```

## WireGuard with IPv6-Only Server

Some deployments have IPv6-only servers. Clients can still tunnel IPv4:

```ini
# Client: connect to IPv6 server, tunnel IPv4

[Interface]
Address = 10.0.0.2/32   # IPv4 tunnel address (IPv4-only client)
PrivateKey = <client-private-key>

[Peer]
PublicKey = <server-public-key>
# Connect using server's IPv6 address
Endpoint = [2001:db8::1]:51820
# Route IPv4 default through IPv6 tunnel
AllowedIPs = 0.0.0.0/0
```

## Monitoring Dual-Stack Tunnel Status

```bash
# Show WireGuard status including handshake and traffic
sudo wg show wg0

# Expected output:
# interface: wg0
#   public key: ...
#   listening port: 51820
#
# peer: <client-key>
#   endpoint: [client-ipv6]:port (or ipv4:port)
#   allowed ips: 10.0.0.2/32, fd00:abcd::2/128
#   latest handshake: 30 seconds ago
#   transfer: 1.44 MiB received, 872 KiB sent

# Continuous monitoring
watch -n 1 sudo wg show
```

WireGuard's dual-stack tunnel configuration is straightforward - add multiple `Address` directives and include both IPv4 and IPv6 CIDRs in `AllowedIPs` to achieve full dual-stack VPN connectivity in a single tunnel.
