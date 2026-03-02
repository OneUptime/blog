# How to Set Up a Snap Store Proxy for Enterprise Ubuntu Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Enterprise, DevOps, Linux

Description: Step-by-step instructions for deploying a Snap Store Proxy server for enterprise Ubuntu environments, enabling controlled snap distribution with caching and override support.

---

Enterprise Ubuntu deployments often require controlled software distribution - you need to know exactly which versions of software are running on which machines, maintain the ability to freeze updates, and route traffic through your own infrastructure rather than directly to the internet. The Snap Store Proxy addresses these requirements for snap packages.

## What the Snap Store Proxy Provides

The Snap Store Proxy is a self-hosted service that acts as an intermediary between your Ubuntu machines and the public Snap Store. It provides:

- **Caching**: Snap packages are cached locally after the first download, reducing bandwidth and improving install times on subsequent machines
- **Override control**: Pin specific revisions for any snap on any channel
- **Offline operation**: Once snaps are cached, machines can install and refresh without internet access
- **Audit trail**: Logs of all snap installs and refreshes across your fleet
- **Access control**: Allowlists to restrict which snaps can be installed

The proxy is part of Canonical's Ubuntu Advantage (now Ubuntu Pro) offering and requires a subscription for production use.

## Architecture Overview

```
Ubuntu Clients --> Snap Store Proxy --> Snap Store (canonical)
                        |
                   Local Cache
                   (PostgreSQL + disk)
```

The proxy can be deployed in various configurations:
- Single server for small deployments
- Load-balanced pair for high availability
- Fully offline (requires periodic sync from a connected instance)

## Server Requirements

Choose a dedicated server for the proxy:
- Ubuntu 18.04 or later (20.04+ recommended)
- 4+ CPU cores
- 8GB+ RAM
- 100GB+ disk space (for snap cache; scale with your snap count)
- Network access to the Snap Store (or another proxy for cascading)
- Stable internal DNS hostname

## Step 1: Install Required Software

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl enable --now postgresql

# Install the snap-store-proxy snap
sudo snap install snap-store-proxy
```

## Step 2: Configure PostgreSQL

```bash
# Switch to the postgres user
sudo -u postgres psql << 'PSQL'
-- Create the proxy user and database
CREATE USER snap_proxy_user WITH PASSWORD 'changeme-use-a-strong-password';
CREATE DATABASE snap_proxy_db OWNER snap_proxy_user;
GRANT ALL PRIVILEGES ON DATABASE snap_proxy_db TO snap_proxy_user;
\q
PSQL

# Verify the database was created
sudo -u postgres psql -l | grep snap_proxy_db
```

Configure PostgreSQL to accept connections from the snap-store-proxy:

```bash
# By default, local connections use peer auth
# The proxy connects as the snap_proxy_user with password
# Edit pg_hba.conf to allow password auth for localhost

sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Find the line for local connections and ensure it allows md5 or scram-sha-256 authentication:

```
# IPv4 local connections:
host    snap_proxy_db    snap_proxy_user    127.0.0.1/32    scram-sha-256
```

```bash
# Reload PostgreSQL configuration
sudo systemctl reload postgresql

# Test the connection
psql -h localhost -U snap_proxy_user -d snap_proxy_db -c "SELECT version();"
```

## Step 3: Configure the Snap Store Proxy

```bash
# Set the database connection string
sudo snap set snap-store-proxy store.db="postgresql://snap_proxy_user:changeme-use-a-strong-password@localhost/snap_proxy_db"

# Set the external URL (what clients will connect to)
# Use your actual server's hostname or IP
sudo snap set snap-store-proxy proxy.domain=snap-proxy.corp.example.com

# Optional: configure the port (default 8080)
sudo snap set snap-store-proxy proxy.port=8080

# Initialize the database schema
sudo snap-proxy init
```

## Step 4: Register the Proxy with Canonical

Registration connects your proxy instance to the Snap Store, enabling it to verify snap assertions and download packages:

```bash
# Register the proxy
# You'll need a Snap Store account (snapcraft.io)
sudo snap-proxy register

# This will:
# 1. Open a browser for authentication (or give you a URL)
# 2. Register your proxy with Canonical's infrastructure
# 3. Generate a store-id for your proxy

# Save the store-id output - you'll need it for client configuration
```

After registration, the proxy has its own store ID that clients use to authenticate with your proxy instead of the public Snap Store.

## Step 5: Start and Verify the Proxy Service

```bash
# Start the proxy
sudo snap start snap-store-proxy

# Check service status
sudo snap services snap-store-proxy

# Check the logs
sudo snap logs snap-store-proxy -n 50

# Test the API endpoint
curl -s http://localhost:8080/v2/snaps/info/core | python3 -m json.tool | head -20

# Check proxy health endpoint
curl http://localhost:8080/v2/health
```

## Step 6: Configure TLS (Recommended)

For production deployments, terminate TLS at the proxy. You can use nginx as a reverse proxy:

```bash
# Install nginx and certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Create nginx config for the snap proxy
sudo tee /etc/nginx/sites-available/snap-proxy << 'EOF'
server {
    listen 80;
    server_name snap-proxy.corp.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name snap-proxy.corp.example.com;

    # SSL configuration (certbot will populate these)
    ssl_certificate /etc/letsencrypt/live/snap-proxy.corp.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/snap-proxy.corp.example.com/privkey.pem;

    # Proxy to snap-store-proxy
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Large file support for snap packages
        client_max_body_size 0;
        proxy_read_timeout 300;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/snap-proxy /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

For internal certificates (non-public DNS), distribute your CA certificate to client machines:

```bash
# On each client, install the CA certificate
sudo cp your-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

## Step 7: Configure Client Ubuntu Machines

```bash
# Get your proxy's store ID from the proxy server
# This was output during the register step
PROXY_STORE_ID="your-store-id-here"

# On each client machine, point snapd at your proxy
sudo snap set core store.url=https://snap-proxy.corp.example.com

# Alternative method using environment variable
# Add to /etc/environment for persistent configuration:
echo "SNAPPY_STORE_NO_CDN=1" | sudo tee -a /etc/environment

# Restart snapd on the client
sudo systemctl restart snapd

# Test by refreshing - should now route through your proxy
sudo snap refresh
```

## Managing Snap Overrides

```bash
# On the proxy server: pin a snap to a specific revision
sudo snap-proxy override firefox stable=4201

# Remove an override (allow latest)
sudo snap-proxy override firefox stable=

# List all active overrides
sudo snap-proxy list-overrides

# Override across multiple channels
sudo snap-proxy override code stable=123 candidate=125
```

## Monitoring and Maintenance

```bash
# Check proxy statistics
sudo snap-proxy stats

# View recent activity log
sudo snap logs snap-store-proxy -n 200

# Check cache disk usage
du -sh /var/snap/snap-store-proxy/

# Monitor with systemd
sudo journalctl -u snap.snap-store-proxy.proxyd -f

# Database backup
sudo -u postgres pg_dump snap_proxy_db > snap_proxy_backup_$(date +%Y%m%d).sql
```

## High Availability Setup

For critical infrastructure, run two proxy instances behind a load balancer:

```bash
# Both proxy instances share the same PostgreSQL database
# Configure a shared NFS mount or replicated storage for the snap cache

# On the load balancer (nginx example)
upstream snap_proxy {
    server proxy1.corp.example.com:8080;
    server proxy2.corp.example.com:8080;
    # Both connect to the same PostgreSQL instance
}
```

The Snap Store Proxy significantly simplifies snap fleet management. Once deployed, you can confidently control what software versions run across your Ubuntu infrastructure, whether that means allowing controlled updates, freezing production systems at tested versions, or operating entirely offline after initial caching.
