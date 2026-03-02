# How to Set Up Headscale (Self-Hosted Tailscale) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, Networking, Tailscale, Security

Description: Learn how to install and configure Headscale, the open-source self-hosted Tailscale control server, on Ubuntu to run your own private WireGuard-based mesh network.

---

Tailscale is a popular mesh VPN built on WireGuard, but it requires using Tailscale's hosted coordination server. Headscale is an open-source reimplementation of that coordination server that you can host yourself. With Headscale, you get the same Tailscale client experience on your devices - including the official Tailscale apps - but your control plane stays on infrastructure you own.

This matters if you have strict data sovereignty requirements, want to avoid dependency on a third-party service for network connectivity, or just prefer keeping your network topology private.

## How Tailscale/Headscale Works

Tailscale (and by extension Headscale) uses WireGuard for the actual data plane encryption. The coordination server's job is much more limited: it distributes WireGuard public keys and IP address assignments to all nodes in your network (called a "tailnet"). The actual traffic flows directly between nodes peer-to-peer via WireGuard, not through the coordination server.

This means:
- The control server (Headscale) doesn't see your actual network traffic
- Nodes communicate directly when possible, through DERP relay servers when not
- DERP (Designated Encrypted Relay for Packets) servers handle NAT traversal fallback

## Prerequisites

- Ubuntu 20.04 or later
- A public-facing server with a domain name (e.g., `headscale.example.com`)
- Port 80 and 443 accessible for HTTPS (and optionally 3478/UDP for DERP)
- Root access

## Installing Headscale

```bash
# Download the latest Headscale release
# Check https://github.com/juanfont/headscale/releases for current version
curl -LO https://github.com/juanfont/headscale/releases/download/v0.23.0/headscale_0.23.0_linux_amd64.deb

# Install the .deb package
sudo dpkg -i headscale_0.23.0_linux_amd64.deb

# The package installs:
# /usr/bin/headscale - the server binary
# /etc/headscale/config.yaml - configuration file
# /lib/systemd/system/headscale.service - systemd unit

# Verify the installation
headscale version
```

## Configuring Headscale

The main configuration file is at `/etc/headscale/config.yaml`. Edit it to match your environment:

```bash
sudo nano /etc/headscale/config.yaml
```

Key settings to configure:

```yaml
# Server URL - this must be publicly reachable by your clients
server_url: https://headscale.example.com

# Address and port Headscale listens on locally
listen_addr: 0.0.0.0:8080

# GRPC listen address (used by headscale CLI)
grpc_listen_addr: 127.0.0.1:50443

# Allow insecure gRPC for local use (CLI connects on loopback)
grpc_allow_insecure: true

# Private key for the server - auto-generated on first run
private_key_path: /var/lib/headscale/private.key

# Noise private key (for Tailscale's Noise protocol)
noise:
  private_key_path: /var/lib/headscale/noise_private.key

# IP prefixes to assign to nodes
prefixes:
  v4: 100.64.0.0/10
  v6: fd7a:115c:a1e0::/48

# Database configuration
db_type: sqlite3
db_path: /var/lib/headscale/db.sqlite

# TLS configuration
# If using a reverse proxy (nginx), disable TLS here
tls_letsencrypt_hostname: ""
tls_cert_path: ""
tls_key_path: ""

# DERP server configuration
derp:
  # Use Tailscale's public DERP servers (convenient for getting started)
  urls:
    - https://controlplane.tailscale.com/derpmap/default
  # Auto-update DERP map
  auto_update_enabled: true
  update_frequency: 24h

# Log level
log:
  level: info
```

## Setting Up Nginx as a Reverse Proxy

Headscale works best behind a reverse proxy handling TLS:

```bash
sudo apt install nginx certbot python3-certbot-nginx

# Get a certificate for your domain
sudo certbot --nginx -d headscale.example.com
```

Create the nginx configuration:

```bash
sudo tee /etc/nginx/sites-available/headscale << 'EOF'
server {
    listen 80;
    server_name headscale.example.com;
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name headscale.example.com;

    ssl_certificate /etc/letsencrypt/live/headscale.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/headscale.example.com/privkey.pem;

    # Headscale requires these for WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Disable buffering for long-poll connections
    proxy_buffering off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    location / {
        proxy_pass http://localhost:8080;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/headscale /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Starting Headscale

```bash
# Start and enable Headscale
sudo systemctl enable --now headscale

# Check status
systemctl status headscale

# Monitor logs
journalctl -u headscale -f
```

## Managing Users and Nodes

Headscale organizes nodes into users (previously called "namespaces"). Each user is an isolated group:

```bash
# Create a user
sudo headscale users create myuser

# List users
sudo headscale users list

# Generate a pre-authentication key for a user
# This key is used when registering new nodes
sudo headscale preauthkeys create --user myuser

# Generate a reusable key (can be used by multiple devices)
sudo headscale preauthkeys create --user myuser --reusable

# Generate an expiring key (expires in 24h by default)
sudo headscale preauthkeys create --user myuser --expiration 720h

# List pre-auth keys for a user
sudo headscale preauthkeys list --user myuser
```

## Connecting Clients

Install the official Tailscale client on devices you want to connect:

```bash
# On Ubuntu clients
curl -fsSL https://tailscale.com/install.sh | sh

# Connect to your Headscale server instead of Tailscale's servers
# Replace YOUR_PREAUTH_KEY with the key generated above
sudo tailscale up \
    --login-server https://headscale.example.com \
    --authkey YOUR_PREAUTH_KEY

# Check connection status
tailscale status

# Get your Tailscale IP address
tailscale ip
```

For macOS or Windows clients using the official Tailscale app, they need to be directed to your server. This requires either using the CLI version or a custom configuration:

```bash
# macOS with Tailscale CLI
tailscale up --login-server https://headscale.example.com --authkey YOUR_PREAUTH_KEY
```

## Viewing and Managing Nodes

```bash
# List all registered nodes
sudo headscale nodes list

# Get routes advertised by nodes
sudo headscale routes list

# Approve a subnet route advertised by a node
sudo headscale routes enable -r ROUTE_ID

# Rename a node
sudo headscale nodes rename --identifier NODE_ID new-hostname

# Delete a node
sudo headscale nodes delete --identifier NODE_ID

# Move a node to a different user
sudo headscale nodes move --identifier NODE_ID --user otheruser
```

## Enabling Subnet Routing

Tailscale/Headscale supports subnet routing - one node can advertise a private subnet and act as a gateway for other nodes to reach it:

```bash
# On the node that has access to a private subnet (e.g., 192.168.1.0/24)
sudo tailscale up \
    --login-server https://headscale.example.com \
    --authkey YOUR_PREAUTH_KEY \
    --advertise-routes=192.168.1.0/24

# On the Headscale server, approve the route
sudo headscale routes list
sudo headscale routes enable -r ROUTE_ID

# On other nodes, enable route acceptance
sudo tailscale set --accept-routes
```

## Setting Up an Exit Node

An exit node routes all internet traffic through one node - useful for accessing the internet through a specific location:

```bash
# On the node you want to be an exit node
sudo tailscale up \
    --login-server https://headscale.example.com \
    --advertise-exit-node

# Approve the exit node on Headscale
sudo headscale routes list
sudo headscale routes enable -r EXIT_ROUTE_ID

# On a client that wants to use the exit node
# Get the exit node's Tailscale IP from 'tailscale status'
sudo tailscale set --exit-node=100.64.0.X
```

## Configuring Your Own DERP Server

For better control and potentially lower latency, you can run your own DERP server:

```bash
# Install derper (Tailscale's DERP server)
go install tailscale.com/cmd/derper@latest

# Or download a pre-built binary from Tailscale's GitHub

# Run derper (usually on a separate public server)
derper --hostname=derp.example.com \
    --certdir=/etc/letsencrypt/live/derp.example.com \
    --http-port=-1 \
    --stun-port=3478
```

Then update your Headscale config to use it:

```yaml
derp:
  # Remove the external URLs and add your own DERP map
  urls: []
  paths:
    - /etc/headscale/derp.yaml
```

Create `/etc/headscale/derp.yaml`:

```yaml
regions:
  900:
    regionid: 900
    regioncode: custom
    regionname: My DERP
    nodes:
      - name: 900a
        regionid: 900
        hostname: derp.example.com
        derpport: 443
        stunport: 3478
```

Headscale gives you full ownership of your network coordination layer without giving up the convenience of the Tailscale client ecosystem. Once you have it running, adding new nodes is just a matter of generating a pre-auth key and running `tailscale up` on the new machine.
