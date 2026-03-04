# How to Configure WireGuard VPN Clients with nmcli on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, WireGuard, VPN, nmcli, Linux

Description: Learn how to configure WireGuard VPN client connections using NetworkManager and nmcli on RHEL 9, providing seamless integration with the system's network management stack.

---

Most WireGuard tutorials show you the wg-quick approach, which works fine. But if you want WireGuard managed by NetworkManager like the rest of your network connections, nmcli is the way to go. This gives you proper integration with the system's networking stack, automatic reconnection, and the ability to manage WireGuard alongside your other connections.

## Why Use nmcli Instead of wg-quick

NetworkManager integration means:
- WireGuard follows the same connection lifecycle as your other interfaces
- You can use `nmcli connection up/down` to control it
- DNS gets handled through NetworkManager's resolver stack
- It shows up in `nmcli device status` alongside your physical interfaces
- Autoconnect and connection priorities work normally

## Prerequisites

- RHEL 9 client system with NetworkManager running
- WireGuard tools installed
- Server's public key and endpoint information
- A pre-shared key (optional but recommended)

## Installing WireGuard Tools

```bash
# Install EPEL and WireGuard tools
sudo dnf install -y epel-release
sudo dnf install -y wireguard-tools
```

## Generating Client Keys

```bash
# Generate the client key pair
wg genkey | tee /tmp/wg_private.key | wg pubkey > /tmp/wg_public.key

# Read the keys
PRIVATE_KEY=$(cat /tmp/wg_private.key)
PUBLIC_KEY=$(cat /tmp/wg_public.key)

echo "Private: $PRIVATE_KEY"
echo "Public: $PUBLIC_KEY"
```

Send the public key to your VPN server administrator so they can add you as a peer.

## Creating the WireGuard Connection with nmcli

Here is the core setup. You create a connection of type `wireguard` and configure it entirely through nmcli.

```bash
# Create the WireGuard connection
sudo nmcli connection add \
    type wireguard \
    con-name "wg-vpn" \
    ifname wg0 \
    autoconnect no

# Set the client's private key
sudo nmcli connection modify "wg-vpn" \
    wireguard.private-key "$(cat /tmp/wg_private.key)"

# Set the listen port (0 means random, fine for clients)
sudo nmcli connection modify "wg-vpn" \
    wireguard.listen-port 0

# Assign the tunnel IP address
sudo nmcli connection modify "wg-vpn" \
    ipv4.method manual \
    ipv4.addresses "10.0.0.2/24"

# Set DNS through the tunnel
sudo nmcli connection modify "wg-vpn" \
    ipv4.dns "1.1.1.1"
```

## Adding the Server as a Peer

This is where it gets a bit different from the wg-quick approach. You need to import a peer configuration or edit the connection file directly.

```bash
# The nmcli peer syntax requires editing the connection file
# Find the connection file
sudo ls /etc/NetworkManager/system-connections/ | grep wg
```

Edit the connection file to add the peer section:

```bash
sudo tee -a /etc/NetworkManager/system-connections/wg-vpn.nmconnection > /dev/null << 'EOF'

[wireguard-peer.SERVER_PUBLIC_KEY_HERE]
endpoint=YOUR_SERVER_IP:51820
allowed-ips=0.0.0.0/0;
persistent-keepalive=25
EOF
```

Replace `SERVER_PUBLIC_KEY_HERE` with the actual server public key and `YOUR_SERVER_IP` with the server's address.

```bash
# Reload NetworkManager to pick up the changes
sudo nmcli connection reload
```

## Alternative: Import from a wg-quick Config

If you already have a standard WireGuard config file, you can import it into NetworkManager.

```bash
# Create a standard WireGuard config first
sudo tee /tmp/wg0.conf > /dev/null << 'EOF'
[Interface]
PrivateKey = CLIENT_PRIVATE_KEY
Address = 10.0.0.2/24
DNS = 1.1.1.1

[Peer]
PublicKey = SERVER_PUBLIC_KEY
Endpoint = SERVER_IP:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
EOF

# Import it into NetworkManager
sudo nmcli connection import type wireguard file /tmp/wg0.conf
```

This creates a NetworkManager connection from the wg-quick format automatically.

## Connecting and Disconnecting

```bash
# Bring up the VPN
sudo nmcli connection up "wg-vpn"

# Check the status
nmcli device status
nmcli connection show --active

# Check WireGuard-specific status
sudo wg show wg0

# Disconnect
sudo nmcli connection down "wg-vpn"
```

## Setting Autoconnect

If you want the VPN to connect automatically on boot:

```bash
# Enable autoconnect
sudo nmcli connection modify "wg-vpn" autoconnect yes

# Or set it to connect only on specific conditions
sudo nmcli connection modify "wg-vpn" autoconnect-priority 10
```

## Configuring Split DNS

If you only want DNS queries for specific domains to go through the VPN:

```bash
# Set DNS search domains for the VPN connection
sudo nmcli connection modify "wg-vpn" \
    ipv4.dns-search "internal.company.com" \
    ipv4.dns-priority -100
```

The negative priority means this connection's DNS will be preferred for matching domains.

## Verifying the Connection

```bash
# Check the WireGuard interface
ip addr show wg0

# Verify routing
ip route show

# Test connectivity through the tunnel
ping -c 4 10.0.0.1

# Check your external IP
curl ifconfig.me

# Verify DNS resolution
dig +short example.com
```

## Managing Multiple VPN Connections

You can have multiple WireGuard connections configured and switch between them.

```bash
# List all WireGuard connections
nmcli connection show | grep wireguard

# Connect to a specific VPN
sudo nmcli connection up "wg-office"

# Disconnect from the current and connect to another
sudo nmcli connection down "wg-office"
sudo nmcli connection up "wg-home"
```

## Troubleshooting

**Connection fails to come up:**

```bash
# Check NetworkManager logs
journalctl -u NetworkManager --since "5 minutes ago" | grep -i wireguard

# Verify the config file is valid
sudo cat /etc/NetworkManager/system-connections/wg-vpn.nmconnection
```

**No traffic flowing after connection:**

```bash
# Check WireGuard handshake status
sudo wg show wg0

# Verify routing table
ip route show table all | grep wg0

# Check DNS
resolvectl status wg0
```

**DNS not working through the tunnel:**

```bash
# Check DNS configuration
nmcli connection show "wg-vpn" | grep dns

# Restart the connection
sudo nmcli connection down "wg-vpn" && sudo nmcli connection up "wg-vpn"
```

## Wrapping Up

Managing WireGuard through NetworkManager on RHEL 9 keeps your VPN configuration consistent with the rest of your network stack. The import method from an existing wg-quick config is the fastest path, but building the connection from scratch with nmcli gives you fine-grained control. Either way, you end up with a WireGuard tunnel that behaves like any other managed network connection.
