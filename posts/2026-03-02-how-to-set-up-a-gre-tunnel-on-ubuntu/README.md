# How to Set Up a GRE Tunnel on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, GRE Tunnel, VPN, Routing

Description: A step-by-step guide to creating and configuring GRE tunnels on Ubuntu, including static and dynamic routing through the tunnel and making the configuration persistent.

---

GRE (Generic Routing Encapsulation) tunnels encapsulate one network protocol inside another, creating a virtual point-to-point link between two endpoints over an existing IP network. They're commonly used to connect separate networks across the internet, extend Layer 3 routing between sites, and carry traffic types that wouldn't otherwise traverse certain network boundaries. Unlike IPSec or WireGuard, GRE tunnels don't encrypt traffic - they're purely for encapsulation and routing.

## When to Use GRE Tunnels

GRE tunnels make sense when:
- Connecting two private networks across a public or routed network
- You need to route non-IP protocols across an IP network
- You want site-to-site connectivity without full VPN complexity
- You're building multi-protocol backbone infrastructure
- Combining with IPSec for encrypted tunnel transport (GRE over IPSec)

## Prerequisites

Two Ubuntu machines with:
- Public or routable IP addresses on an interface
- IP forwarding enabled (for routing traffic through the tunnel)
- `iproute2` installed (included by default on Ubuntu)

## Setting Up IP Forwarding

Both machines need IP forwarding enabled to route traffic:

```bash
# Enable IP forwarding temporarily
sudo sysctl -w net.ipv4.ip_forward=1

# Make it persistent
sudo tee /etc/sysctl.d/99-ip-forwarding.conf << 'EOF'
# Enable IPv4 forwarding for routing
net.ipv4.ip_forward = 1
# Enable IPv6 forwarding if needed
# net.ipv6.conf.all.forwarding = 1
EOF

# Apply the persistent configuration
sudo sysctl -p /etc/sysctl.d/99-ip-forwarding.conf

# Verify
cat /proc/sys/net/ipv4/ip_forward
# Should output: 1
```

## Example Topology

For this guide, assume:
- **Server A** (left side):
  - Public IP: 203.0.113.1
  - Private network: 192.168.1.0/24
  - Tunnel IP: 10.0.0.1/30

- **Server B** (right side):
  - Public IP: 198.51.100.1
  - Private network: 192.168.2.0/24
  - Tunnel IP: 10.0.0.2/30

The goal: machines on 192.168.1.0/24 should be able to reach machines on 192.168.2.0/24 through the GRE tunnel.

## Creating the GRE Tunnel

### On Server A (203.0.113.1)

```bash
# Create the GRE tunnel interface
sudo ip tunnel add gre1 \
    mode gre \
    local 203.0.113.1 \     # This server's public IP
    remote 198.51.100.1 \   # Remote server's public IP
    ttl 255 \               # Time-to-live for encapsulated packets
    dev eth0               # Interface to use for the tunnel

# Bring the tunnel interface up
sudo ip link set gre1 up

# Assign an IP address to the tunnel interface
sudo ip addr add 10.0.0.1/30 dev gre1

# Verify the interface is up
ip addr show gre1
ip link show gre1

# Add a route to the remote private network through the tunnel
sudo ip route add 192.168.2.0/24 via 10.0.0.2 dev gre1
```

### On Server B (198.51.100.1)

```bash
# Create the GRE tunnel interface (mirror of Server A)
sudo ip tunnel add gre1 \
    mode gre \
    local 198.51.100.1 \    # This server's public IP
    remote 203.0.113.1 \    # Remote server's public IP
    ttl 255 \
    dev eth0

# Bring the tunnel up
sudo ip link set gre1 up

# Assign IP address
sudo ip addr add 10.0.0.2/30 dev gre1

# Add route to the remote private network
sudo ip route add 192.168.1.0/24 via 10.0.0.1 dev gre1
```

## Testing the Tunnel

```bash
# From Server A, ping Server B's tunnel endpoint
ping -c 3 10.0.0.2

# Ping something on Server B's private network
ping -c 3 192.168.2.1

# From Server A, trace the path
traceroute 192.168.2.1

# Check tunnel statistics
ip -s tunnel show gre1
cat /proc/net/dev | grep gre1

# Capture tunnel traffic (should show GRE packets)
sudo tcpdump -i eth0 proto gre -n
```

## Checking GRE Tunnel Status

```bash
# List all tunnels
ip tunnel show

# Detailed info about a specific tunnel
ip tunnel show gre1

# Show the interface state
ip link show gre1

# Show routes going through the tunnel
ip route show dev gre1
```

## Firewall Configuration

Allow GRE traffic through the firewall. GRE uses IP protocol 47:

```bash
# Using iptables
# Allow GRE from the remote endpoint
sudo iptables -A INPUT -s 198.51.100.1 -p gre -j ACCEPT
sudo iptables -A OUTPUT -d 198.51.100.1 -p gre -j ACCEPT

# Allow forwarding through the tunnel
sudo iptables -A FORWARD -i gre1 -j ACCEPT
sudo iptables -A FORWARD -o gre1 -j ACCEPT

# Using UFW - it doesn't directly support GRE, use iptables rules
# Save rules
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

With `nftables` (Ubuntu 20.04+):

```bash
# Create nftables rules for GRE
sudo tee /etc/nftables.conf << 'EOF'
#!/usr/sbin/nft -f
flush ruleset

table inet filter {
    chain input {
        type filter hook input priority filter; policy drop;

        # Allow established connections
        ct state established,related accept

        # Allow loopback
        iif lo accept

        # Allow SSH
        tcp dport 22 accept

        # Allow GRE from remote tunnel endpoint
        ip protocol 47 ip saddr 198.51.100.1 accept
    }

    chain forward {
        type filter hook forward priority filter; policy drop;

        # Allow traffic through GRE tunnel
        iifname "gre1" accept
        oifname "gre1" accept
    }

    chain output {
        type filter hook output priority filter; policy accept;
    }
}
EOF

sudo systemctl enable --now nftables
```

## Making the Tunnel Persistent

Configuration added with `ip` commands is lost on reboot. Make it persistent using Netplan (Ubuntu 18.04+):

### Method 1: Netplan

```yaml
# /etc/netplan/02-gre-tunnel.yaml
network:
  version: 2
  tunnels:
    gre1:
      mode: gre
      local: 203.0.113.1
      remote: 198.51.100.1
      addresses:
        - 10.0.0.1/30
      routes:
        - to: 192.168.2.0/24
          via: 10.0.0.2
```

```bash
sudo netplan apply

# Verify
ip tunnel show gre1
ip route show dev gre1
```

### Method 2: systemd-networkd

```bash
# Create the netdev file for the GRE interface
sudo tee /etc/systemd/network/10-gre1.netdev << 'EOF'
[NetDev]
Name=gre1
Kind=gre

[Tunnel]
Local=203.0.113.1
Remote=198.51.100.1
EOF

# Create the network file for IP configuration
sudo tee /etc/systemd/network/10-gre1.network << 'EOF'
[Match]
Name=gre1

[Network]
Address=10.0.0.1/30

[Route]
Destination=192.168.2.0/24
Gateway=10.0.0.2
EOF

# Restart networkd
sudo systemctl restart systemd-networkd

# Verify
networkctl status gre1
```

### Method 3: Startup Script

```bash
# Create a startup script
sudo tee /usr/local/bin/setup-gre-tunnel.sh << 'EOF'
#!/bin/bash
# Set up GRE tunnel

set -euo pipefail

TUNNEL_NAME="gre1"
LOCAL_IP="203.0.113.1"
REMOTE_IP="198.51.100.1"
TUNNEL_LOCAL="10.0.0.1"
TUNNEL_REMOTE="10.0.0.2"
REMOTE_NETWORK="192.168.2.0/24"

# Remove existing tunnel if it exists
ip tunnel del "$TUNNEL_NAME" 2>/dev/null || true

# Create the tunnel
ip tunnel add "$TUNNEL_NAME" \
    mode gre \
    local "$LOCAL_IP" \
    remote "$REMOTE_IP" \
    ttl 255

# Configure the interface
ip link set "$TUNNEL_NAME" up
ip addr add "${TUNNEL_LOCAL}/30" dev "$TUNNEL_NAME"

# Add route
ip route add "$REMOTE_NETWORK" via "$TUNNEL_REMOTE" dev "$TUNNEL_NAME"

echo "GRE tunnel $TUNNEL_NAME configured"
EOF

sudo chmod +x /usr/local/bin/setup-gre-tunnel.sh

# Create systemd service
sudo tee /etc/systemd/system/gre-tunnel.service << 'EOF'
[Unit]
Description=GRE Tunnel Setup
After=network.target
Wants=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-gre-tunnel.sh
RemainAfterExit=yes
ExecStop=/sbin/ip tunnel del gre1

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now gre-tunnel.service
```

## MTU Considerations

GRE encapsulation adds a 24-byte overhead. If the outer link has a 1500-byte MTU, the GRE tunnel's effective MTU is 1476 bytes. This can cause fragmentation issues:

```bash
# Check current MTU
ip link show gre1 | grep mtu

# Set appropriate MTU for GRE tunnel
sudo ip link set gre1 mtu 1476

# Or test with ping to find the max MTU
ping -M do -s 1450 10.0.0.2    # don't fragment, 1450-byte payload
ping -M do -s 1452 10.0.0.2    # adjust up/down to find limit
```

In Netplan:

```yaml
tunnels:
  gre1:
    mode: gre
    local: 203.0.113.1
    remote: 198.51.100.1
    mtu: 1476
    addresses:
      - 10.0.0.1/30
```

## GRE Tunnel Limitations

- No encryption - combine with IPSec if security is needed
- No authentication - anyone who can spoof the source IP can inject packets
- No built-in keepalive - you won't know the tunnel is down until traffic fails
- Adds overhead to all packets traversing the tunnel

For simple site-to-site connectivity over a trusted network where encryption isn't required, GRE tunnels are lightweight and effective. For untrusted networks, consider GRE over IPSec or use WireGuard or OpenVPN instead.
