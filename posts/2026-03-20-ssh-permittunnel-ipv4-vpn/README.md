# How to Configure SSH PermitTunnel for IPv4 VPN-Like Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, PermitTunnel, IPv4, VPN, Tun, Layer 3 Tunneling

Description: Configure SSH PermitTunnel to create Layer 3 IPv4 VPN-like tunnels using tun devices, routing entire subnets over an encrypted SSH connection.

## Introduction

SSH `PermitTunnel` allows clients to request tun/tap virtual network devices between client and server, allowing Layer 3 routing over SSH. This creates a full VPN-like connection without dedicated VPN software-useful for emergency access when VPN infrastructure is unavailable.

## Server-Side Configuration

```bash
# /etc/ssh/sshd_config (on SSH server)

# Enable tun device forwarding

PermitTunnel yes     # Enables both tun (layer 3) and tap (layer 2)
# PermitTunnel point-to-point  # Layer 3 only (used here for IPv4 routing)

# The tunnel endpoint needs permission to create tun devices.
# Root is the simplest option; non-root users need CAP_NET_ADMIN and tun access.
PermitRootLogin prohibit-password  # Allows root key-based login, not passwords

# Run from a shell after editing sshd_config
sudo systemctl restart sshd
```

## Creating the Tunnel

```bash
# On client: create tun tunnel as root
# -w: tun device numbers (client:server)
# Syntax: ssh -w <client_tun>:<server_tun>
sudo ssh -4 -w 0:0 root@203.0.113.10

# After connecting, configure the tun interfaces:
# On SERVER (203.0.113.10):
sudo ip addr add 10.99.99.1/30 dev tun0
sudo ip link set tun0 up

# On CLIENT:
sudo ip addr add 10.99.99.2/30 dev tun0
sudo ip link set tun0 up

# Test the tunnel
ping 10.99.99.1   # From client, should reach server's tun0
```

## Routing Traffic Through the Tunnel

```bash
# On client: route specific subnets through the tunnel
# Route private 192.168.1.0/24 (behind server) through tunnel
sudo ip route add 192.168.1.0/24 via 10.99.99.1 dev tun0

# For full-tunnel VPN (all traffic through SSH):
# Get current default gateway
ip route show default
# Add route for SSH server via original default GW first
ORIGINAL_GW=$(ip route show default | awk 'NR==1 {print $3}')
sudo ip route add 203.0.113.10/32 via "${ORIGINAL_GW}"
# Route all other traffic through tunnel
sudo ip route replace default via 10.99.99.1 dev tun0

# Enable IP forwarding on server
ssh root@203.0.113.10 "sysctl -w net.ipv4.ip_forward=1"
# Replace eth0 with the server's outbound interface if needed
ssh root@203.0.113.10 "iptables -t nat -A POSTROUTING -s 10.99.99.0/30 -o eth0 -j MASQUERADE"
```

## Script to Set Up SSH Tunnel VPN

```bash
#!/bin/bash
# /usr/local/bin/ssh-vpn-connect.sh

SERVER="203.0.113.10"
SERVER_TUN_IP="10.99.99.1"
CLIENT_TUN_IP="10.99.99.2"
REMOTE_SUBNET="192.168.1.0/24"
OUTBOUND_IF="eth0"  # Replace with server's outbound interface

# Create tunnel (background)
sudo ssh -4 -fN -w 0:0 root@${SERVER}

sleep 2

# Configure interfaces
sudo ip addr add ${CLIENT_TUN_IP}/30 dev tun0
sudo ip link set tun0 up

# Configure on server
ssh root@${SERVER} "
    ip addr add ${SERVER_TUN_IP}/30 dev tun0
    ip link set tun0 up
    sysctl -w net.ipv4.ip_forward=1
    iptables -t nat -A POSTROUTING -s 10.99.99.0/30 -o ${OUTBOUND_IF} -j MASQUERADE
"

# Route remote subnet through tunnel
sudo ip route add ${REMOTE_SUBNET} via ${SERVER_TUN_IP} dev tun0

echo "SSH VPN connected. Remote subnet ${REMOTE_SUBNET} accessible."
```

## Limitations vs. Dedicated VPN

| Feature | SSH Tunnel VPN | OpenVPN/WireGuard |
|---|---|---|
| Setup complexity | High (manual) | Low (automated) |
| Performance | Medium | High |
| UDP traffic | Yes (encapsulated over SSH/TCP) | Yes (native UDP transport) |
| Client reconnect | Manual | Automatic |
| Certificate management | SSH keys | PKI (OpenVPN) / public keys (WireGuard) |

## Conclusion

SSH `PermitTunnel` creates Layer 3 IPv4 VPN-like tunnels using `ssh -w` and `tun` devices. While functional for emergency access, dedicated VPN solutions (WireGuard, OpenVPN) are more practical for production use due to automatic reconnection, native UDP transport support, and simpler routing management. Use SSH tunneling as a fallback when VPN infrastructure is unavailable.
