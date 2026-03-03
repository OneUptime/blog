# How to Set Up NetBird VPN on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, WireGuard, Networking, Security

Description: Complete guide to deploying NetBird peer-to-peer VPN on Ubuntu, including self-hosted management server setup, client installation, and network policy configuration.

---

NetBird is a WireGuard-based overlay network that automatically handles NAT traversal, peer discovery, and access control - the parts that make self-hosted WireGuard painful at scale. Instead of maintaining a central VPN server that all traffic routes through, NetBird creates direct peer-to-peer tunnels between machines when possible, falling back to relay servers only when NAT traversal fails.

This guide covers both the self-hosted management server deployment and the client setup.

## Architecture

NetBird has three components:

- **Management Server** - handles peer registration, network policy, and key exchange
- **Signal Server** - relays connection establishment messages between peers
- **TURN/STUN Server (Coturn)** - relay for peers that cannot connect directly
- **NetBird Client** - runs on each peer, manages the WireGuard interface

For a small team, you can use NetBird Cloud (netbird.io) and skip the server setup entirely. This guide covers the self-hosted path.

## Prerequisites

- Ubuntu 20.04 or 22.04 server for the management plane
- Docker Engine and Docker Compose v2
- A domain name pointing to your server
- Ports 80, 443, 3478 (UDP/TCP), 5349 (TLS), 10000 (UDP) open

## Self-Hosted Management Server Setup

NetBird provides a Docker Compose setup for self-hosting:

```bash
# Download the setup script
curl -fsSL https://github.com/netbirdio/netbird/releases/latest/download/setup.env.example -o setup.env

# Edit the setup environment
nano setup.env
```

Key variables to set in `setup.env`:

```bash
# Your server's domain name
NETBIRD_DOMAIN=vpn.yourdomain.com

# TURN server credentials (generate random strings)
TURN_USER=netbird
TURN_PASSWORD=$(openssl rand -base64 32)

# Identity provider (netbird supports Google, GitHub, Azure AD, etc.)
# For testing, use built-in authentication
NETBIRD_AUTH_OIDC_CONFIGURATION_ENDPOINT=https://netbird.eu.auth0.com/.well-known/openid-configuration
```

Download and start the stack:

```bash
curl -fsSL https://raw.githubusercontent.com/netbirdio/netbird/main/infrastructure_files/docker-compose.yml -o docker-compose.yml
curl -fsSL https://raw.githubusercontent.com/netbirdio/netbird/main/infrastructure_files/management.json -o management.json

# Start all services
docker compose up -d
```

The stack includes:
- `netbird-management` - management API and web dashboard
- `netbird-signal` - WebRTC signaling server
- `coturn` - TURN/STUN relay server
- `netbird-dashboard` - web UI

Access the dashboard at `https://vpn.yourdomain.com`.

## Firewall Configuration

```bash
# TURN/STUN for NAT traversal
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw allow 5349/tcp

# Media relay port range
sudo ufw allow 10000:20000/udp

# HTTPS for management and dashboard
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp

sudo ufw enable
```

## Installing the NetBird Client on Ubuntu

On each machine that should join the network:

```bash
# Add the NetBird repository
curl -fsSL https://pkgs.netbird.io/install.sh | sh

# Verify installation
netbird version
```

## Connecting a Peer to the Network

```bash
# Connect to self-hosted management server
sudo netbird up --management-url https://vpn.yourdomain.com:443 --admin-url https://vpn.yourdomain.com:443

# For NetBird Cloud
sudo netbird up
```

The command outputs a URL to open in a browser for authentication. After authenticating, the peer registers with the management server and gets a WireGuard IP in the `100.64.0.0/10` range.

Check the connection status:

```bash
# Show peer status and connections
netbird status

# Verbose output showing WireGuard details
netbird status --detail
```

## Managing Peers via the Dashboard

The NetBird dashboard at `https://vpn.yourdomain.com` shows:

- All registered peers with their IP, status, and last seen time
- Network routes configured for subnet access
- Access control policies

To add a new peer, simply run `netbird up` on the new machine and authenticate.

## Configuring Network Policies

By default, all peers in a network can reach each other. Access Control Policies let you restrict this.

In the dashboard, go to Access Control > Policies and create a rule:

```text
Name: Engineering Only
Source: Group "engineers"
Destination: Group "production-servers"
Action: Allow
Ports: 22, 80, 443
```

Assign users to groups in the Users section.

For API-based policy management:

```bash
# Get an API token from the dashboard (Settings > API Keys)
TOKEN="your-api-token"

# Create a policy via API
curl -X POST https://vpn.yourdomain.com/api/policies \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Allow SSH to prod",
    "enabled": true,
    "rules": [{
      "sources": ["engineers"],
      "destinations": ["prod-servers"],
      "ports": ["22"],
      "action": "accept"
    }]
  }'
```

## Setting Up Network Routes

NetBird can route traffic to subnets not running the NetBird client. This is useful for reaching on-premises networks or cloud VPCs.

On a machine that has access to the target subnet (e.g., `192.168.10.0/24`):

```bash
# Enable routing on the machine
sudo sysctl -w net.ipv4.ip_forward=1
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.d/99-netbird.conf
```

In the dashboard, go to Network Routes > Add Route:
- Network: `192.168.10.0/24`
- Router peer: the machine with access to that subnet
- Route metric: 9999 (lower is preferred)

All other peers will now route `192.168.10.0/24` through the designated router peer.

## DNS Configuration

NetBird integrates with your existing DNS. Configure nameserver routing in the dashboard under DNS:

```text
Domain: internal.yourdomain.com
Nameservers: 192.168.1.53
Peers groups: All
```

This routes DNS queries for `*.internal.yourdomain.com` to your internal DNS server through the VPN.

## Running the Client as a System Service

The NetBird client runs as a system daemon automatically after installation. Verify:

```bash
sudo systemctl status netbird

# View logs
sudo journalctl -u netbird -f

# Restart the service
sudo systemctl restart netbird
```

## Disconnecting and Removing a Peer

```bash
# Disconnect from the network (stops the WireGuard tunnel)
sudo netbird down

# Remove the peer from the management server (in dashboard)
# Or via CLI
sudo netbird logout
```

In the dashboard, peers that have been logged out show as inactive. You can permanently delete them from the Peers section.

## Upgrading the Client

```bash
# The repository handles updates
sudo apt update && sudo apt upgrade netbird
```

## Troubleshooting

**Peer shows as disconnected:**
```bash
# Check if WireGuard interface is up
ip link show wt0

# Check NetBird logs
sudo journalctl -u netbird --since "5 minutes ago"
```

**Cannot reach other peers:**
```bash
# Ping another peer by its NetBird IP
ping 100.64.0.2

# Check peer details
netbird status --detail | grep -A 5 "peer-name"
```

**NAT traversal failing (using relay):**
Check that your TURN server ports are open. Test with:
```bash
# From an external machine, test TURN reachability
turnutils_stunclient -p 3478 vpn.yourdomain.com
```

NetBird handles the operational complexity that makes WireGuard at scale difficult. The automatic NAT traversal means peers connect directly without routing everything through a central server, which keeps latency low and bandwidth requirements on the management server minimal.
