# How to Configure WireGuard for IPv6 Traffic Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WireGuard, IPv6, Routing, VPN, AllowedIPs, Network

Description: A guide to configuring WireGuard's AllowedIPs to route IPv6 traffic through WireGuard tunnels, including full tunnel, split tunnel, and specific prefix routing.

WireGuard uses the `AllowedIPs` directive to control which IPv6 traffic is routed through the tunnel. This functions as both a routing table and an ACL: outbound traffic to these prefixes is sent through the peer, and inbound traffic from the peer is only accepted if it comes from these prefixes.

## AllowedIPs for IPv6

The `AllowedIPs` directive accepts CIDR notation for both IPv4 and IPv6:

```ini
# Route all IPv6 traffic through the peer

AllowedIPs = ::/0

# Route only specific IPv6 prefixes
AllowedIPs = 2001:db8:1::/48

# Route both IPv4 and IPv6 (full tunnel)
AllowedIPs = 0.0.0.0/0, ::/0
```

## Full Tunnel Configuration (All IPv6 Through VPN)

```ini
# /etc/wireguard/wg0.conf (client - full tunnel)

[Interface]
Address = fd00:1::2/128
PrivateKey = <client-private-key>
DNS = 2001:4860:4860::8888

[Peer]
PublicKey = <server-public-key>
Endpoint = [2001:db8::1]:51820
# Route all IPv4 and IPv6 traffic through VPN
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
```

## Split Tunnel Configuration (Specific IPv6 Prefixes)

```ini
# /etc/wireguard/wg0.conf (client - split tunnel)

[Interface]
Address = fd00:1::2/128
PrivateKey = <client-private-key>

[Peer]
PublicKey = <server-public-key>
Endpoint = [2001:db8::1]:51820

# Route only specific prefixes through VPN:
#   fd00:1::/64      = VPN internal
#   2001:db8:2::/48  = Office network
#   fd00:2::/32      = Internal services
AllowedIPs = fd00:1::/64, 2001:db8:2::/48, fd00:2::/32
```

## Server-Side Routing Configuration

```ini
# /etc/wireguard/wg0.conf (server)

[Interface]
Address = fd00:1::1/64
ListenPort = 51820
PrivateKey = <server-private-key>

# IPv6 forwarding setup
PostUp = sysctl -w net.ipv6.conf.all.forwarding=1
PostUp = ip6tables -A FORWARD -i wg0 -j ACCEPT
PostUp = ip6tables -t nat -A POSTROUTING -s fd00:1::/64 -o eth0 -j MASQUERADE
PreDown = ip6tables -D FORWARD -i wg0 -j ACCEPT
PreDown = ip6tables -t nat -D POSTROUTING -s fd00:1::/64 -o eth0 -j MASQUERADE

[Peer]
PublicKey = <client-public-key>
# Server accepts traffic from this client's tunnel address only
AllowedIPs = fd00:1::2/128
```

## Routing Multiple IPv6 Clients

```ini
# Server: each client has its own AllowedIPs

[Peer]
# Client A
PublicKey = <client-a-public-key>
AllowedIPs = fd00:1::2/128

[Peer]
# Client B
PublicKey = <client-b-public-key>
AllowedIPs = fd00:1::3/128

[Peer]
# Remote office network
PublicKey = <office-router-public-key>
AllowedIPs = fd00:1::100/128, 2001:db8:2::/48
```

## Dynamic Routing with WireGuard

WireGuard itself is policy-based (AllowedIPs), but you can integrate with dynamic routing:

```bash
# Add BIRD routing daemon alongside WireGuard for dynamic IPv6 routing
apt install bird2

# Configure BIRD to exchange routes with peers via BGP or OSPF
# and inject them into the kernel routing table
# WireGuard handles the encryption, BIRD handles the routing intelligence
```

## Verifying IPv6 Traffic Routing

```bash
# Check that IPv6 default route points to wg0
ip -6 route show default
# Expected: default dev wg0 metric 25

# Test IPv6 connectivity through tunnel
ping6 -c 3 2001:4860:4860::8888

# Confirm exit address is VPN server's IPv6
curl -6 https://ifconfig.co

# Watch IPv6 traffic on the tunnel
sudo tcpdump -i wg0 -n ip6
```

## Calculating AllowedIPs for Split Tunnel (Excluding a Subnet)

```bash
# If you want to route all global IPv6 but exclude ULA (fd00::/8):
# Use a tool like wg-split-tunnel to generate the complementary routes,
# or calculate the set manually.

# Route all global unicast IPv6 (excludes ULA fc00::/7 and link-local fe80::/10)
AllowedIPs = 2000::/3
```

WireGuard's AllowedIPs provides precise control over which IPv6 traffic travels through each tunnel peer, making it straightforward to implement both full-tunnel and split-tunnel IPv6 routing policies.
