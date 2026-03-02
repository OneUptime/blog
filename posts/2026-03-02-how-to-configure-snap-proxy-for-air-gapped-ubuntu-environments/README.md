# How to Configure Snap Proxy for Air-Gapped Ubuntu Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Air-Gapped, Enterprise, Linux

Description: A guide to configuring the Snap Store Proxy for air-gapped or restricted Ubuntu environments where direct internet access to the Snap Store is not available.

---

Enterprise environments often have strict network controls that prevent direct access to the internet from production systems. Ubuntu's snap ecosystem supports these environments through the Snap Store Proxy - a self-hosted service that caches snap packages and provides a local mirror of the Snap Store. This guide covers setting up both a proxy and configuring systems to use it.

## Understanding the Options

There are two main approaches for air-gapped snap usage:

1. **Snap Store Proxy** - A Canonical-supported product that runs an on-premises instance of the Snap Store, with caching, access control, and override capabilities. Requires a Canonical support contract for production use.

2. **Manual snap sideloading** - Downloading snap files on a connected machine and transferring them manually to air-gapped systems.

For most enterprise deployments, the proxy is the right answer. For small or one-time deployments, sideloading may be simpler.

## Method 1: Manual Sideloading for Simple Cases

If you only need to install a small number of snaps on systems without internet access, sideloading works without any additional infrastructure:

```bash
# On a machine WITH internet access:
# Download the snap and all its assertions
snap download firefox

# This creates two files:
# firefox_<rev>.snap        - the snap package itself
# firefox_<rev>.assert      - cryptographic assertions for verification

# Transfer both files to the air-gapped machine
scp firefox_*.snap firefox_*.assert user@airgapped-host:/tmp/
```

On the air-gapped machine:

```bash
# Install the assertion first (required for secure installation)
sudo snap ack /tmp/firefox_4201.assert

# Then install the snap
sudo snap install /tmp/firefox_4201.snap

# If assertions are not available or you're in a test environment:
sudo snap install /tmp/firefox_4201.snap --dangerous
# --dangerous bypasses assertion checking (not recommended for production)
```

The limitation of sideloading is that updates must be managed manually. Every time you want to update a snap, you repeat this process.

## Method 2: Snap Store Proxy

The Snap Store Proxy is a full-featured solution for enterprise environments. It provides:
- Local caching of snap packages
- Control over which snaps and revisions are available
- Override support to pin specific revisions
- Analytics and audit logs

### Prerequisites

The proxy runs as a snap itself and requires:
- Ubuntu 18.04 or later
- At least 50GB disk space for the cache
- PostgreSQL database (can be local or remote)
- Network access from the proxy machine to snapcraft.io
- Network access from client machines to the proxy

```bash
# Install the snap-store-proxy snap on your proxy server
sudo snap install snap-store-proxy

# Install PostgreSQL for the proxy's database
sudo apt install postgresql -y
sudo systemctl enable --now postgresql
```

### Configuring the Database

```bash
# Create the database and user
sudo -u postgres psql << 'EOF'
CREATE USER snapproxy WITH PASSWORD 'your-secure-password';
CREATE DATABASE snapproxy OWNER snapproxy;
GRANT ALL PRIVILEGES ON DATABASE snapproxy TO snapproxy;
EOF
```

### Registering the Proxy with Canonical

```bash
# Register your proxy with the Snap Store
# This requires a Snap Store account (snapcraft.io)
sudo snap-proxy register

# Follow the prompts - you'll need to:
# 1. Authenticate with your Snap Store credentials
# 2. Provide a name for your proxy
# 3. Agree to terms of service
```

After registration, you receive a proxy ID and secret that authenticate your proxy with the Snap Store.

### Configuring the Proxy

```bash
# Configure the database connection
sudo snap set snap-store-proxy db.host=localhost
sudo snap set snap-store-proxy db.port=5432
sudo snap set snap-store-proxy db.name=snapproxy
sudo snap set snap-store-proxy db.user=snapproxy
sudo snap set snap-store-proxy db.password=your-secure-password

# Set the external URL that clients will use to reach the proxy
sudo snap set snap-store-proxy proxy.domain=snap-proxy.internal.example.com

# Configure the port (default is 8080)
sudo snap set snap-store-proxy proxy.port=8080

# Initialize the proxy (runs database migrations)
sudo snap-proxy init
```

### Starting the Proxy Service

```bash
# Start the proxy
sudo snap start snap-store-proxy

# Verify it's running
sudo snap services snap-store-proxy

# Check the logs
sudo snap logs snap-store-proxy
```

### Testing the Proxy

```bash
# From the proxy server itself, test the API
curl http://localhost:8080/v2/snaps/info/core

# Should return JSON with snap information
```

## Configuring Client Machines to Use the Proxy

On each Ubuntu machine that should use the proxy instead of the public Snap Store:

```bash
# Configure snapd to use your proxy
sudo snap set core proxy.http=http://snap-proxy.internal.example.com:8080
sudo snap set core proxy.https=http://snap-proxy.internal.example.com:8080

# Or set the store URL directly (preferred method)
sudo snap set core proxy.store=<your-proxy-id>
```

To get the proxy store ID:

```bash
# On the proxy server
sudo snap-proxy config | grep store-id
```

On client machines, configure the store:

```bash
# Point snapd at your proxy store
sudo snap set core store.url=http://snap-proxy.internal.example.com:8080
```

Restart snapd for changes to take effect:

```bash
sudo systemctl restart snapd

# Verify snapd is using the proxy
sudo snap refresh
# Should connect to your proxy instead of snapcraft.io
```

## Controlling Which Snaps Are Available

The proxy lets you override which revision clients receive for a given snap and channel:

```bash
# Pin firefox to revision 4050 on the stable channel
sudo snap-proxy override firefox stable=4050

# Allow any revision (remove the override)
sudo snap-proxy override firefox stable=--

# List current overrides
sudo snap-proxy list-overrides
```

You can also restrict which snaps clients can install:

```bash
# Allow only specific snaps (deny all others)
sudo snap-proxy allowlist add firefox
sudo snap-proxy allowlist add core22
sudo snap-proxy allowlist add snapd

# Enable the allowlist (this blocks all non-listed snaps)
sudo snap-proxy config set allowlist.enabled=true
```

## Firewall Configuration

Configure your firewall to allow client-to-proxy traffic:

```bash
# On the proxy server, allow inbound from your network
sudo ufw allow from 10.0.0.0/8 to any port 8080 proto tcp

# The proxy itself needs outbound to Canonical's infrastructure
# Allow outbound to snapcraft.io, api.snapcraft.io, and snap CDN
sudo ufw allow out to 91.189.0.0/16
```

## Monitoring Proxy Health

```bash
# Check proxy status and statistics
curl http://localhost:8080/v2/system-info | python3 -m json.tool

# View recent proxy logs
sudo snap logs snap-store-proxy --num=100

# Check cache disk usage
du -sh /var/snap/snap-store-proxy/current/
```

The Snap Store Proxy significantly simplifies snap management in regulated or air-gapped environments. Once deployed, client machines use snaps exactly as they would with internet access, but all traffic goes through your controlled infrastructure. Combined with override support to pin revisions, you gain the predictability that enterprise environments require while retaining the snap ecosystem's update and rollback capabilities.
