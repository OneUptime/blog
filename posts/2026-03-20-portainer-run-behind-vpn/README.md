# How to Run Portainer Behind a VPN for Secure Access - Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, VPN, Networking, Hardening

Description: Learn how to secure your Portainer installation by placing it behind a VPN, ensuring only authenticated VPN users can reach the management interface.

## Introduction

Placing Portainer behind a VPN is one of the most effective security controls you can apply. Instead of exposing Portainer directly to the internet, access is restricted to VPN-connected users only. This removes Portainer's direct internet-facing attack surface.

## Prerequisites

- A VPN server (WireGuard, OpenVPN, or managed VPN service)
- Portainer installed on a server
- Ability to configure firewall rules on the server

## Architecture Options

**Option A: Portainer on VPN-Only Network**
```text
Internet → [Blocked by firewall]
VPN Users → VPN Server → Private Network → Portainer Server
```

**Option B: Server in Cloud with VPN Interface**
```text
Internet → [Blocked: port 9443]
VPN Users → WireGuard VPN → Server internal IP → Portainer
```

## Method 1: WireGuard VPN Setup

WireGuard is the recommended VPN for modern setups - fast, simple, and secure.

### Install WireGuard on the Server

```bash
# Install WireGuard

sudo apt update && sudo apt install wireguard -y

# Generate server keys
sudo sh -c 'umask 077; wg genkey | tee /etc/wireguard/server-private.key | wg pubkey > /etc/wireguard/server-public.key'

SERVER_PRIVATE=$(sudo cat /etc/wireguard/server-private.key)
SERVER_PUBLIC=$(sudo cat /etc/wireguard/server-public.key)
echo "Server public key: $SERVER_PUBLIC"
```

### Configure WireGuard Server

```ini
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.10.0.1/24
PrivateKey = SERVER_PRIVATE_KEY_HERE
ListenPort = 51820
# Replace YOUR_PUBLIC_INTERFACE with the server's outbound interface if you need forwarding/NAT
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o YOUR_PUBLIC_INTERFACE -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o YOUR_PUBLIC_INTERFACE -j MASQUERADE

[Peer]
# Admin user 1
PublicKey = ADMIN_1_PUBLIC_KEY
AllowedIPs = 10.10.0.2/32

[Peer]
# Developer user 1
PublicKey = DEV_1_PUBLIC_KEY
AllowedIPs = 10.10.0.3/32
```

```bash
# Enable and start WireGuard
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0

# Verify
sudo wg show
```

### Configure Firewall to Restrict Portainer

```bash
# Allow WireGuard from anywhere
sudo ufw allow 51820/udp

# If Portainer is published with Docker, do not rely on UFW alone.
# Bind it to the WireGuard IP instead of 0.0.0.0, for example by recreating it with:
# docker run -d \
#   --name portainer \
#   --restart=always \
#   -p 10.10.0.1:9443:9443 \
#   -v /var/run/docker.sock:/var/run/docker.sock \
#   -v portainer_data:/data \
#   portainer/portainer-ce:sts
#
# UFW rules below apply to services listening on the host itself.
sudo ufw allow from 10.10.0.0/24 to any port 9443 proto tcp comment "Portainer - VPN only"

# Deny Portainer from all other sources
sudo ufw deny 9443/tcp

# Apply rules
sudo ufw enable
sudo ufw reload

# Verify rules
sudo ufw status verbose | grep 9443
```

### Create VPN Client Configuration

```bash
# Generate client keys
umask 077
wg genkey | tee client-private.key | wg pubkey > client-public.key

CLIENT_PRIVATE=$(cat client-private.key)
CLIENT_PUBLIC=$(cat client-public.key)
SERVER_PUBLIC=$(sudo cat /etc/wireguard/server-public.key)
SERVER_IP="203.0.113.100"  # Your server's public IP

# Client config file
cat > client.conf << EOF
[Interface]
Address = 10.10.0.2/32
PrivateKey = $CLIENT_PRIVATE
DNS = 1.1.1.1

[Peer]
PublicKey = $SERVER_PUBLIC
Endpoint = $SERVER_IP:51820
AllowedIPs = 10.10.0.0/24
PersistentKeepalive = 25
EOF

echo "Client config created: client.conf"

# Add client public key to server config
echo "
[Peer]
# Add to /etc/wireguard/wg0.conf
PublicKey = $CLIENT_PUBLIC
AllowedIPs = 10.10.0.2/32"
```

## Method 2: Tailscale (Zero-Config VPN)

Tailscale is an easier-to-manage VPN built on WireGuard:

```bash
# Install Tailscale on the Portainer server
curl -fsSL https://tailscale.com/install.sh | sh
# Requires tag ownership for tag:portainer in your tailnet policy
sudo tailscale up --advertise-tags=tag:portainer

# Get the Tailscale IP of the server
TAILSCALE_IP=$(tailscale ip -4)
echo "Server Tailscale IP: $TAILSCALE_IP"
```

Configure Portainer to bind to the Tailscale interface:

```bash
# Bind Portainer to Tailscale IP only
docker run -d \
  --name portainer \
  --restart=always \
  -p ${TAILSCALE_IP}:9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

# Users access via: https://100.x.x.x:9443 (Tailscale IP)
```

Using Tailscale ACLs:

```json
// Tailscale ACL - restrict Portainer access to specific tags
{
  "acls": [
    {
      "action": "accept",
      "src": ["tag:portainer-admins"],
      "dst": ["tag:portainer:9443"]
    }
  ]
}
```

## Method 3: OpenVPN Access Server

For enterprise environments with centralized VPN management:

```bash
# Install OpenVPN Access Server (Docker)
docker run -d \
  --name=openvpn-as \
  --device /dev/net/tun \
  --cap-add=MKNOD \
  --cap-add=NET_ADMIN \
  -p 943:943 \
  -p 443:443/tcp \
  -p 1194:1194/udp \
  -v /path/to/openvpn-data:/openvpn \
  --restart=unless-stopped \
  openvpn/openvpn-as

# Configure routing to reach Portainer's private subnet
# In OpenVPN AS dashboard: Configuration -> VPN Settings -> Routing
# Set "Should VPN clients have access to private subnets?" to Yes, using NAT
# Set "Specify the subnets to which all clients should be given access" to the Portainer subnet, for example 10.0.0.0/24
```

## Step: Verify VPN-Only Access

```bash
# Test without VPN (should fail or be blocked)
curl -k https://portainer.example.com:9443/api/system/status
# Expected: Connection refused or timeout

# Test with VPN connected (should work)
curl -k https://10.10.0.1:9443/api/system/status
# Expected: JSON response with fields such as Version and InstanceID
```

## Conclusion

Running Portainer behind a VPN removes its direct internet-facing exposure, which blocks opportunistic brute force attacks, credential stuffing, and direct exploitation from the public internet. WireGuard provides a modern, performant option for self-managed VPN, while Tailscale offers the easiest setup for teams who prefer a managed service. Either approach dramatically improves your security posture compared to direct internet exposure.
