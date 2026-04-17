# How to Configure WireGuard with IPv6 Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WireGuard, IPv6, VPN, Endpoint, Network Configuration, Tunneling

Description: A guide to configuring WireGuard VPN with IPv6 endpoints, allowing WireGuard peers to connect using IPv6 addresses.

WireGuard supports IPv6 natively for both the tunnel transport (peer endpoints) and the tunnel addresses (AllowedIPs). This guide covers configuring WireGuard to use IPv6 addresses as peer endpoints, enabling WireGuard connections over IPv6 networks.

## WireGuard IPv6 Endpoint Basics

In WireGuard, the `Endpoint` directive specifies where to reach a peer. For IPv6, use bracket notation: `[IPv6address]:port`.

## Server Configuration

```ini
# /etc/wireguard/wg0.conf (server)

[Interface]
# Server's tunnel IPv6 address

Address = fd00::1/64
Address = 10.0.0.1/24

# Listen port
ListenPort = 51820

# Server's private key
PrivateKey = <server-private-key>

# PostUp/PreDown for IPv6 routing
PostUp = ip6tables -A FORWARD -i wg0 -j ACCEPT; ip6tables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PreDown = ip6tables -D FORWARD -i wg0 -j ACCEPT; ip6tables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Also add IPv4 rules
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PreDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# Client public key
PublicKey = <client-public-key>
AllowedIPs = fd00::2/128, 10.0.0.2/32
```

## Client Configuration with IPv6 Endpoint

```ini
# /etc/wireguard/wg0.conf (client)

[Interface]
# Client's tunnel IPv6 address
Address = fd00::2/64
Address = 10.0.0.2/24

PrivateKey = <client-private-key>

# Optional: use specific DNS over IPv6
DNS = 2001:4860:4860::8888

[Peer]
PublicKey = <server-public-key>

# Connect to server using its IPv6 address
Endpoint = [2001:db8::1]:51820

# Route all traffic through VPN
AllowedIPs = 0.0.0.0/0, ::/0

# Keepalive for NAT traversal
PersistentKeepalive = 25
```

## Generating Keys

```bash
# Generate key pair
wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key

# Secure the private key
chmod 600 /etc/wireguard/private.key

# View keys
cat /etc/wireguard/private.key
cat /etc/wireguard/public.key
```

## Starting WireGuard

```bash
# Bring up the interface
sudo wg-quick up wg0

# Verify interface is up
sudo wg show

# Check IPv6 address assigned to wg0
ip -6 addr show wg0

# Enable at boot
sudo systemctl enable wg-quick@wg0
```

## Dual-Stack Endpoint with Hostname

If your server has a DNS name that resolves to both IPv4 and IPv6:

```ini
[Peer]
PublicKey = <server-public-key>
# WireGuard resolves the hostname - if it has AAAA record, IPv6 is used
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0, ::/0
```

## Firewall Rules for IPv6 WireGuard

```bash
# Allow WireGuard port over IPv6
sudo ip6tables -A INPUT -p udp --dport 51820 -j ACCEPT

# Allow established
sudo ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow traffic from WireGuard peers
sudo ip6tables -A FORWARD -i wg0 -j ACCEPT
sudo ip6tables -A FORWARD -o wg0 -j ACCEPT
```

## Verifying IPv6 Endpoint Connectivity

```bash
# Check peer status and last handshake time
sudo wg show wg0

# Test ping over IPv6 tunnel
ping6 fd00::1   # Ping server's tunnel IPv6 address

# Verify traffic is encrypted
sudo tcpdump -i eth0 -n 'udp port 51820'

# Check that IPv6 traffic routes through wg0
ip -6 route show
```

## Troubleshooting

```bash
# Verify server is listening on IPv6 UDP port
sudo ss -6 -ulnp | grep 51820

# Test UDP reachability to server's IPv6 endpoint
nc -6 -u 2001:db8::1 51820
```

WireGuard's clean configuration model makes IPv6 endpoint support straightforward - just use bracket notation for IPv6 addresses in the Endpoint directive.
