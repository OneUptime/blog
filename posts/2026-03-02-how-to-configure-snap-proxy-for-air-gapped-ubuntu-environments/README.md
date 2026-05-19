# How to Configure Snap Proxy for Air-Gapped Ubuntu Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Air-Gapped, Enterprise, Linux

Description: A guide to configuring the Snap Store Proxy for air-gapped or restricted Ubuntu environments where direct internet access to the Snap Store is not available.

---

Enterprise environments often have strict network controls that prevent direct access to the internet from production systems. Ubuntu's snap ecosystem supports these environments through the Snap Store Proxy - now called Enterprise Store - a self-hosted service that caches snap packages and can operate in an offline mode. This guide covers setting up both a proxy and configuring systems to use it.

## Understanding the Options

There are two main approaches for air-gapped snap usage:

1. **Snap Store Proxy** - A Canonical-supported product that runs an on-premises proxy for the Snap Store, with caching, offline mode, and override capabilities.

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
- Offline mode for disconnected environments

### Prerequisites

The proxy runs as a snap itself and requires:
- A currently supported Ubuntu LTS release on AMD64
- Enough disk space for the snaps you expect to cache or import
- PostgreSQL database (can be local or remote)
- Network access from the proxy machine to Canonical's Snap Store infrastructure, unless configured for offline mode
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
CREATE ROLE "snapproxy-user" LOGIN CREATEROLE PASSWORD 'your-secure-password';
CREATE DATABASE "snapproxy-db" OWNER "snapproxy-user";
\connect "snapproxy-db"
CREATE EXTENSION "btree_gist";
EOF
```

### Registering the Proxy with Canonical

```bash
# Set the domain or IP address clients will use to reach the proxy
sudo snap-proxy config proxy.domain="snap-proxy.internal.example.com"

# Register your proxy with the Snap Store
# This requires a Snap Store account (snapcraft.io)
sudo snap-proxy register

# Follow the prompts - you'll need to:
# 1. Authenticate with your Snap Store credentials
# 2. Provide a name for your proxy
# 3. Agree to terms of service
```

After registration, the proxy receives a Store ID that clients use when they are configured to connect through it.

### Configuring the Proxy

```bash
# Configure the database connection
sudo snap-proxy config proxy.db.connection="postgresql://snapproxy-user@localhost:5432/snapproxy-db"

# Check that the proxy can reach the Snap Store services it needs
snap-proxy check-connections
```

### Starting the Proxy Service

```bash
# Verify it's running
sudo snap services snap-store-proxy

# Check the logs
sudo snap logs snap-store-proxy
```

### Testing the Proxy

```bash
# Check registration and service status
snap-proxy status

# Check the API is reachable from the proxy server
curl -I http://localhost/v2/auth/store/assertions
```

## Configuring Client Machines to Use the Proxy

On each Ubuntu machine that should use the proxy instead of the public Snap Store:

```bash
# Import the signed store assertion so snapd trusts the proxy
curl -sL http://snap-proxy.internal.example.com/v2/auth/store/assertions | sudo snap ack /dev/stdin

# Configure snapd to use the proxy store
sudo snap set core proxy.store=<your-store-id>
```

To get the proxy store ID:

```bash
# On the proxy server
snap-proxy status
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
sudo snap-proxy delete-override firefox stable

# List current overrides
sudo snap-proxy list-overrides firefox
```

For fully air-gapped deployments, export snaps on a connected machine and import them into the on-prem store:

```bash
# On a connected machine
sudo snap install store-admin
store-admin export snaps firefox core22 snapd --channel=stable --arch=amd64 --export-dir .

# On the air-gapped proxy host, after enabling offline mode
sudo snap-proxy enable-airgap-mode
sudo mv *.tar.gz /var/snap/snap-store-proxy/common/snaps-to-push/
for bundle in /var/snap/snap-store-proxy/common/snaps-to-push/*.tar.gz; do
  sudo snap-store-proxy push-snap "$bundle"
done
```

## Firewall Configuration

Configure your firewall to allow client-to-proxy traffic:

```bash
# On the proxy server, allow inbound from your network
sudo ufw allow from 10.0.0.0/8 to any port 80 proto tcp

# The proxy itself needs outbound to Canonical's infrastructure
# Verify the required outbound destinations before locking down egress
snap-proxy check-connections
```

## Monitoring Proxy Health

```bash
# Check proxy status and statistics
snap-proxy status

# View recent proxy logs
sudo snap logs snap-store-proxy -n=100

# Check cache disk usage
du -sh /var/snap/snap-store-proxy/common/
```

The Snap Store Proxy significantly simplifies snap management in regulated or air-gapped environments. Once deployed, client machines use snaps exactly as they would with internet access, but all traffic goes through your controlled infrastructure. Combined with override support to pin revisions, you gain the predictability that enterprise environments require while retaining the snap ecosystem's update and rollback capabilities.
