# How to Set Up WireGuard with NAT Traversal on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WireGuard, VPN, Networking, NAT

Description: Configure WireGuard VPN with NAT traversal on Ubuntu to connect peers behind firewalls and NAT devices without port forwarding.

---

WireGuard is a modern VPN protocol that's fast, simple, and uses state-of-the-art cryptography. One of its challenges is that, unlike OpenVPN, WireGuard is UDP-based and stateless, which means peers behind NAT need special configuration to maintain reachability. This guide covers setting up WireGuard with proper NAT traversal so peers can connect even when behind firewalls.

## How WireGuard NAT Traversal Works

WireGuard's NAT traversal relies on a technique called "persistent keepalive." When a peer behind NAT sends a packet, the NAT device creates a mapping of the internal address to a port on its external interface. This mapping expires after a period of inactivity.

WireGuard's `PersistentKeepalive` option sends a keepalive packet at a specified interval to keep the NAT mapping alive. The typical value is 25 seconds, which is short enough to maintain most NAT mappings but not so frequent as to cause excessive traffic.

For two peers both behind NAT, at least one of them typically needs a publicly reachable endpoint, or a third-party relay (like a TURN server or a server with a public IP) needs to be involved.

## Installing WireGuard

```bash
# Install WireGuard tools
sudo apt update
sudo apt install wireguard wireguard-tools

# Verify installation
wg --version
```

## Generating Key Pairs

WireGuard uses Curve25519 key pairs for authentication. Generate keys for each peer:

```bash
# On each machine, generate a key pair
# Generate private key
wg genkey | sudo tee /etc/wireguard/privatekey | wg pubkey | sudo tee /etc/wireguard/publickey

# Set permissions on the private key
sudo chmod 600 /etc/wireguard/privatekey

# View the keys
sudo cat /etc/wireguard/privatekey
sudo cat /etc/wireguard/publickey
```

Do this on both the server and each client.

## Scenario 1: Server with Public IP, Clients Behind NAT

This is the most common setup: one peer (the server) has a public IP, and clients are behind NAT.

### Server Configuration (Public IP)

```bash
sudo nano /etc/wireguard/wg0.conf
```

```ini
[Interface]
# Server's private key
PrivateKey = SERVER_PRIVATE_KEY_HERE

# VPN IP address for this server
Address = 10.0.0.1/24

# Listen port
ListenPort = 51820

# Enable IP forwarding and NAT for client traffic
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Client 1 - behind NAT
[Peer]
# Client 1's public key
PublicKey = CLIENT1_PUBLIC_KEY_HERE
# VPN IP assigned to client 1
AllowedIPs = 10.0.0.2/32

# Client 2 - behind NAT
[Peer]
PublicKey = CLIENT2_PUBLIC_KEY_HERE
AllowedIPs = 10.0.0.3/32
```

Note: Clients behind NAT do not need an `Endpoint` specified in the server config. WireGuard learns their endpoint dynamically when they connect.

### Client Configuration (Behind NAT)

```bash
sudo nano /etc/wireguard/wg0.conf
```

```ini
[Interface]
# Client's private key
PrivateKey = CLIENT_PRIVATE_KEY_HERE

# Client's VPN IP address
Address = 10.0.0.2/24

# DNS server through the VPN (optional)
DNS = 10.0.0.1

[Peer]
# Server's public key
PublicKey = SERVER_PUBLIC_KEY_HERE

# Server's public IP and port
Endpoint = 203.0.113.1:51820

# Route all traffic through VPN (full tunnel)
# For split tunnel, specify specific subnets instead of 0.0.0.0/0
AllowedIPs = 0.0.0.0/0, ::/0

# CRITICAL for NAT traversal: send keepalive every 25 seconds
# This keeps the NAT mapping alive in the router
PersistentKeepalive = 25
```

The `PersistentKeepalive = 25` setting is what enables NAT traversal for the client. Without it, the NAT mapping expires and the server loses the ability to reach the client.

## Scenario 2: Two Peers Both Behind NAT

When both peers are behind NAT, direct connection is difficult without a relay. However, some routers support "NAT hole punching" which WireGuard can take advantage of.

### Using a Relay Server (Recommended)

The most reliable solution is a third VPS or server with a public IP that both peers connect to:

```ini
# Relay server configuration
[Interface]
PrivateKey = RELAY_PRIVATE_KEY
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
# Peer A (behind NAT)
PublicKey = PEER_A_PUBLIC_KEY
AllowedIPs = 10.0.0.2/32

[Peer]
# Peer B (behind NAT)
PublicKey = PEER_B_PUBLIC_KEY
AllowedIPs = 10.0.0.3/32
```

```ini
# Peer A configuration (behind NAT)
[Interface]
PrivateKey = PEER_A_PRIVATE_KEY
Address = 10.0.0.2/24

[Peer]
# The relay server
PublicKey = RELAY_PUBLIC_KEY
Endpoint = relay.example.com:51820
AllowedIPs = 10.0.0.0/24   # Route only VPN subnet through relay
PersistentKeepalive = 25
```

Both peers connect to the relay, and the relay forwards traffic between them.

### Direct Peer-to-Peer with Hole Punching

Some setups allow direct peer connections through NAT:

```ini
# Peer A config - knows Peer B's external IP and port
[Interface]
PrivateKey = PEER_A_PRIVATE_KEY
Address = 10.0.0.2/24
ListenPort = 51821  # Use a consistent port for NAT mapping

[Peer]
PublicKey = PEER_B_PUBLIC_KEY
Endpoint = PEER_B_EXTERNAL_IP:51821
AllowedIPs = 10.0.0.3/32
PersistentKeepalive = 25
```

This works when both NAT devices support consistent port mapping (many do). The challenge is that you need to know Peer B's external IP and port, which may change over time.

## Enabling IP Forwarding

For the server/relay to forward traffic between clients:

```bash
# Enable IP forwarding temporarily
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Make it permanent
sudo nano /etc/sysctl.conf
# Uncomment or add:
# net.ipv4.ip_forward=1
# net.ipv6.conf.all.forwarding=1

sudo sysctl -p
```

## Starting and Managing WireGuard

```bash
# Start the WireGuard interface
sudo wg-quick up wg0

# Stop the interface
sudo wg-quick down wg0

# Enable auto-start at boot
sudo systemctl enable wg-quick@wg0

# Start the systemd service
sudo systemctl start wg-quick@wg0

# Check status
sudo systemctl status wg-quick@wg0
```

## Checking Connection Status and NAT Traversal

```bash
# View current WireGuard status
sudo wg show

# Example output when NAT traversal is working:
# interface: wg0
#   public key: SERVER_PUBLIC_KEY
#   private key: (hidden)
#   listening port: 51820
#
# peer: CLIENT1_PUBLIC_KEY
#   endpoint: 198.51.100.45:12345   <- client's external IP:port (NAT mapped)
#   allowed ips: 10.0.0.2/32
#   latest handshake: 15 seconds ago
#   transfer: 1.23 MiB received, 456 KiB sent
#   persistent keepalive: every 25 seconds

# Check the VPN interface
ip addr show wg0

# Test connectivity to another peer
ping 10.0.0.2
```

The `latest handshake` field shows when the last handshake occurred. If it's recent (within a few minutes), the connection is active.

## Firewall Configuration

### UFW

```bash
# Allow WireGuard port
sudo ufw allow 51820/udp

# If routing traffic, allow forwarding
sudo ufw route allow in on wg0 out on eth0
sudo ufw route allow in on eth0 out on wg0
```

### nftables

```bash
sudo nano /etc/nftables.conf
```

```text
table ip nat {
  chain postrouting {
    type nat hook postrouting priority 100;
    # Masquerade outgoing VPN traffic
    oifname "eth0" ip saddr 10.0.0.0/24 masquerade;
  }
}

table ip filter {
  chain forward {
    type filter hook forward priority 0;
    # Allow forwarding between VPN and external interface
    iifname "wg0" oifname "eth0" accept;
    iifname "eth0" oifname "wg0" ct state related,established accept;
  }
}
```

## Dynamic DNS for Changing Endpoints

If a peer's IP address changes (common with home internet connections), use dynamic DNS:

```bash
# Install ddclient for dynamic DNS updates
sudo apt install ddclient

# Configure it with your DNS provider's API
sudo nano /etc/ddclient.conf

# WireGuard resolves the endpoint hostname periodically
# You can also use wg set to update an endpoint manually
sudo wg set wg0 peer PEER_PUBLIC_KEY endpoint new.hostname.example:51820
```

## Troubleshooting NAT Traversal Issues

### No Handshake Occurring

```bash
# Check if WireGuard is sending and receiving packets
sudo wg show

# Check for firewall blocking
sudo iptables -L -n | grep 51820

# Verify UDP port is reachable from outside
# From another machine:
nc -u -z -v YOUR_SERVER_IP 51820
```

### Handshake Succeeds but No Traffic

```bash
# Check IP forwarding is enabled
cat /proc/sys/net/ipv4/ip_forward
# Should output: 1

# Check routing table
ip route show

# Check for NAT rules
sudo iptables -t nat -L -n -v

# Test with ping
ping -I wg0 10.0.0.1
```

### Connection Drops After Inactivity

If the NAT mapping expires despite `PersistentKeepalive`, try reducing the interval:

```ini
# Try 15 seconds for aggressive NAT devices
PersistentKeepalive = 15
```

Some cellular NAT devices use very short timeouts (as low as 30 seconds). Setting keepalive to 20-25 seconds usually keeps the mapping alive.

WireGuard's simplicity makes it easy to configure once you understand the NAT traversal requirements. The `PersistentKeepalive` option does most of the heavy lifting for single-NAT scenarios, and a relay server handles the cases where both endpoints are behind NAT.
