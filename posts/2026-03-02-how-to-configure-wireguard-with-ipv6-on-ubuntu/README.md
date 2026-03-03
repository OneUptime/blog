# How to Configure WireGuard with IPv6 on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WireGuard, VPN, IPv6, Networking

Description: A complete guide to setting up WireGuard VPN with full IPv6 support on Ubuntu, covering dual-stack configuration, peer setup, and routing.

---

WireGuard is a modern VPN protocol that is fast, minimal, and easy to audit. Most guides cover IPv4-only setups, but running WireGuard with IPv6 - either dual-stack or IPv6-only - is straightforward once you understand how the addressing works. This guide walks through the full setup from installation to a working dual-stack tunnel.

## Prerequisites

You need two Ubuntu machines (or cloud instances) that can reach each other. Both need public IP addresses or at least the server side needs a publicly reachable address. Root or sudo access is required on both.

Check that your kernel is recent enough to include WireGuard natively:

```bash
# WireGuard is in the kernel since 5.6; check your version
uname -r

# On Ubuntu 20.04+ it's available as a kernel module
modinfo wireguard
```

## Installing WireGuard

```bash
# Install on Ubuntu 20.04 and later
sudo apt update
sudo apt install -y wireguard wireguard-tools

# Load the kernel module if not already loaded
sudo modprobe wireguard

# Verify the module is loaded
lsmod | grep wireguard
```

## Generating Keys

WireGuard uses Curve25519 key pairs. Generate them for both the server and each peer.

```bash
# Generate a private/public key pair for the server
# Store in /etc/wireguard with restricted permissions
wg genkey | sudo tee /etc/wireguard/server_private.key | wg pubkey | sudo tee /etc/wireguard/server_public.key
sudo chmod 600 /etc/wireguard/server_private.key

# Generate for the client
wg genkey | tee ~/client_private.key | wg pubkey | tee ~/client_public.key
```

## Planning IPv6 Addressing

WireGuard assigns tunnel addresses independently of the transport layer. You can assign ULA (Unique Local Address) ranges for the tunnel itself even if your public transport is IPv4.

```text
# Example address plan:
# Server tunnel address (IPv4): 10.0.0.1/24
# Server tunnel address (IPv6): fd00:dead:beef::1/64
# Client tunnel address (IPv4): 10.0.0.2/32
# Client tunnel address (IPv6): fd00:dead:beef::2/128
```

ULA prefixes (fd00::/8) are the IPv6 equivalent of RFC1918 private space - they are not routable on the public internet, which is exactly what you want for VPN tunnel addresses.

## Server Configuration

```bash
# /etc/wireguard/wg0.conf on the server

sudo tee /etc/wireguard/wg0.conf > /dev/null <<'EOF'
[Interface]
# The server's private key
PrivateKey = <SERVER_PRIVATE_KEY>

# Assign both IPv4 and IPv6 addresses to the tunnel interface
Address = 10.0.0.1/24, fd00:dead:beef::1/64

# Listen port
ListenPort = 51820

# Enable IP forwarding for both address families when the interface comes up
PostUp = sysctl -w net.ipv4.ip_forward=1
PostUp = sysctl -w net.ipv6.conf.all.forwarding=1

# NAT for IPv4 clients going to the internet (replace eth0 with your outbound interface)
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# IPv6 masquerade (if you don't have a routable IPv6 prefix to assign to clients)
PostUp = ip6tables -A FORWARD -i wg0 -j ACCEPT
PostUp = ip6tables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Clean up on interface down
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
PostDown = ip6tables -D FORWARD -i wg0 -j ACCEPT
PostDown = ip6tables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# The client's public key
PublicKey = <CLIENT_PUBLIC_KEY>

# Allowed IPs: what source addresses are permitted from this peer
# List both the IPv4 and IPv6 tunnel addresses
AllowedIPs = 10.0.0.2/32, fd00:dead:beef::2/128
EOF

sudo chmod 600 /etc/wireguard/wg0.conf
```

## Enabling IPv6 Forwarding Persistently

The `PostUp` lines above set forwarding at runtime, but you should also make it persistent across reboots:

```bash
# Edit sysctl.conf to persist forwarding settings
sudo tee -a /etc/sysctl.d/99-wireguard.conf > /dev/null <<'EOF'
# Enable IPv4 forwarding for WireGuard
net.ipv4.ip_forward = 1

# Enable IPv6 forwarding for WireGuard
net.ipv6.conf.all.forwarding = 1
EOF

# Apply immediately
sudo sysctl -p /etc/sysctl.d/99-wireguard.conf
```

## Client Configuration

```bash
# /etc/wireguard/wg0.conf on the client

sudo tee /etc/wireguard/wg0.conf > /dev/null <<'EOF'
[Interface]
# The client's private key
PrivateKey = <CLIENT_PRIVATE_KEY>

# Assign the client's tunnel addresses
Address = 10.0.0.2/32, fd00:dead:beef::2/128

# Optional: specify DNS servers to use over the tunnel
DNS = 1.1.1.1, 2606:4700:4700::1111

[Peer]
# The server's public key
PublicKey = <SERVER_PUBLIC_KEY>

# The server's public endpoint - can be an IPv4 or IPv6 address
Endpoint = 203.0.113.1:51820

# Route all traffic (IPv4 and IPv6) through the tunnel
# ::/0 is the IPv6 default route equivalent of 0.0.0.0/0
AllowedIPs = 0.0.0.0/0, ::/0

# Send keepalive packets every 25 seconds to maintain NAT mappings
PersistentKeepalive = 25
EOF

sudo chmod 600 /etc/wireguard/wg0.conf
```

## Starting WireGuard

```bash
# Start the interface on both server and client
sudo wg-quick up wg0

# Enable it to start on boot
sudo systemctl enable wg-quick@wg0

# Check the status
sudo wg show

# Verify the interface is up with both address families
ip addr show wg0
ip -6 addr show wg0
```

## Testing IPv6 Connectivity

```bash
# From the client, ping the server's tunnel IPv6 address
ping6 fd00:dead:beef::1

# Check if IPv6 traffic is flowing through the tunnel
# This should show the server's public IPv6 address (if it has one)
curl -6 https://api6.ipify.org

# Trace the path of IPv6 traffic
traceroute6 fd00:dead:beef::1

# Verify the routing table has the IPv6 default route via WireGuard
ip -6 route show
```

## Using a Routable IPv6 Prefix

If your server has a routable IPv6 /64 or larger prefix, you can assign real IPv6 addresses to clients instead of ULA. This is common with many cloud providers.

```bash
# Example: server has 2001:db8:1234:5678::/64
# Assign part of this range to WireGuard clients

# In server wg0.conf Interface section:
# Address = 10.0.0.1/24, 2001:db8:1234:5678::1/64

# In server wg0.conf Peer section for client:
# AllowedIPs = 10.0.0.2/32, 2001:db8:1234:5678::2/128

# With routable IPv6, you don't need ip6tables masquerade
# Just ensure forwarding is enabled and routing is set up correctly
```

## Firewall Considerations

If you are running UFW on the server, you need to allow the WireGuard port:

```bash
# Allow WireGuard UDP port through UFW
sudo ufw allow 51820/udp

# If the server is the gateway and you need to allow forwarded traffic
# Edit /etc/ufw/before.rules and add before the *filter section:
# *nat
# :POSTROUTING ACCEPT [0:0]
# -A POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE
# -A POSTROUTING -s fd00:dead:beef::/64 -o eth0 -j MASQUERADE
# COMMIT

# Also enable forwarding in /etc/default/ufw:
# DEFAULT_FORWARD_POLICY="ACCEPT"
```

## Troubleshooting

```bash
# Check WireGuard interface state
sudo wg show

# Watch handshake activity in real time
sudo wg show wg0 latest-handshakes

# Check if packets are flowing
sudo wg show wg0 transfer

# Verify routes are installed correctly
ip route show table main | grep wg0
ip -6 route show table main | grep wg0

# Check kernel messages for errors
sudo dmesg | grep wireguard

# If IPv6 forwarding seems to not be working
sysctl net.ipv6.conf.all.forwarding
```

A successful WireGuard setup with IPv6 shows handshake timestamps within the last few minutes when you run `wg show`. If the handshake never completes, the most common causes are firewall rules blocking UDP port 51820 or an incorrect public key on one side.

Running WireGuard in dual-stack mode gives you future-proof connectivity and lets clients reach IPv6-only destinations even if their local network does not have native IPv6 support.
