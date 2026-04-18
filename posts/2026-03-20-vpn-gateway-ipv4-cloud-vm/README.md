# How to Set Up a VPN Gateway for IPv4 Traffic on a Cloud VM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VPN, WireGuard, Cloud VM, IPv4, Networking, Gateway, Linux

Description: Configure a Linux cloud VM as a WireGuard VPN gateway to route IPv4 traffic from remote clients through the cloud instance, providing secure internet access and private network connectivity.

## Introduction

A cloud VM acting as a VPN gateway routes client traffic through the cloud provider's network. This is useful for providing employees with secure internet access through a trusted exit node, connecting branch offices to cloud resources, or bypassing geo-restrictions.

## Why WireGuard

WireGuard is the modern choice for a VPN gateway:
- Simple configuration (a few lines vs hundreds for OpenVPN)
- High performance (kernel-native since Linux 5.6)
- Cryptographically strong (Curve25519, ChaCha20, BLAKE2)
- Small codebase (~4,000 lines) - easy to audit and reason about

## Step 1: Install WireGuard on the Cloud VM

```bash
# Ubuntu 20.04+

sudo apt-get update && sudo apt-get install -y wireguard

# Generate server keys
wg genkey | sudo tee /etc/wireguard/server_private.key
sudo cat /etc/wireguard/server_private.key | wg pubkey | sudo tee /etc/wireguard/server_public.key
sudo chmod 600 /etc/wireguard/server_private.key
```

## Step 2: Configure the WireGuard Server

```ini
# /etc/wireguard/wg0.conf (on the cloud VM)

[Interface]
Address = 10.200.0.1/24                   # Gateway's VPN IPv4 address
PrivateKey = <SERVER_PRIVATE_KEY>          # Paste key from server_private.key
ListenPort = 51820                         # UDP port to listen on

# Enable NAT: route all VPN client traffic through the server's internet connection
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; \
         iptables -A FORWARD -o wg0 -j ACCEPT; \
         iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; \
           iptables -D FORWARD -o wg0 -j ACCEPT; \
           iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Client 1 - laptop
[Peer]
PublicKey = <CLIENT1_PUBLIC_KEY>
AllowedIPs = 10.200.0.2/32                 # IP assigned to this client
```

## Step 3: Enable IP Forwarding on the Gateway

```bash
# Enable IP forwarding for routing
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.d/99-wireguard.conf
```

## Step 4: Generate Client Keys and Configure the Client

```bash
# On the client machine, generate key pair
wg genkey | tee client_private.key | wg pubkey > client_public.key

# Add client public key to server config
echo "[Peer]
PublicKey = $(cat client_public.key)
AllowedIPs = 10.200.0.2/32" | sudo tee -a /etc/wireguard/wg0.conf

sudo wg addconf wg0 /dev/stdin <<< "[Peer]
PublicKey = $(cat client_public.key)
AllowedIPs = 10.200.0.2/32"
```

## Step 5: Client Configuration

```ini
# client.conf (on the end user's device)

[Interface]
PrivateKey = <CLIENT_PRIVATE_KEY>
Address = 10.200.0.2/24               # Client's VPN IPv4 address
DNS = 8.8.8.8                          # Use Google DNS (or your private DNS)

[Peer]
PublicKey = <SERVER_PUBLIC_KEY>
Endpoint = CLOUD_VM_PUBLIC_IP:51820    # Server's public IP and port
AllowedIPs = 0.0.0.0/0                 # Route ALL traffic through VPN (full tunnel)
PersistentKeepalive = 25               # Maintain NAT mappings
```

## Step 6: Start WireGuard

```bash
# On the cloud VM
sudo systemctl enable --now wg-quick@wg0
sudo wg show                           # Verify the interface is up
```

## Firewall Configuration (Cloud Provider)

Open UDP port 51820 in your cloud security group:

```bash
# AWS example
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxx \
  --protocol udp \
  --port 51820 \
  --cidr 0.0.0.0/0
```

## Monitoring Connected Clients

```bash
# Show connected peers, their last handshake time, and data transferred
sudo wg show
```

## Conclusion

A WireGuard-based VPN gateway on a cloud VM is simple to set up and maintains excellent performance. It provides a trustworthy exit node for remote workers and can be scaled to many clients with minimal configuration overhead.
