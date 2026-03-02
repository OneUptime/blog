# How to Configure IPFS on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, IPFS, Distributed Storage, P2P, Web3

Description: A practical guide to installing and configuring IPFS on Ubuntu, covering node setup, file pinning, API access, gateway configuration, and running a persistent daemon.

---

IPFS (InterPlanetary File System) is a peer-to-peer distributed file system that addresses content by what it is (a cryptographic hash of the content) rather than where it is (a URL). When you add a file to IPFS, you get back a Content Identifier (CID) like `QmXnnyufdzAWL5CqZ2RnSNgidyqDe7uN41CKVb8wKB4jb8`. Any IPFS node with a copy of that file can serve it to anyone who asks for it by that CID.

This guide installs and configures Kubo (the reference IPFS implementation in Go), sets up the daemon as a systemd service, and covers practical operations.

## Installing IPFS (Kubo)

```bash
# Download the latest Kubo release
KUBO_VERSION=$(curl -s https://api.github.com/repos/ipfs/kubo/releases/latest | grep tag_name | cut -d'"' -f4)
wget "https://github.com/ipfs/kubo/releases/download/${KUBO_VERSION}/kubo_${KUBO_VERSION}_linux-amd64.tar.gz"

# Extract and install
tar xzf kubo_${KUBO_VERSION}_linux-amd64.tar.gz
cd kubo
sudo bash install.sh

# Verify
ipfs version
```

## Initializing the Node

Initialize the IPFS repository in the default location (`~/.ipfs`):

```bash
ipfs init
```

Output shows your node's peer ID:

```
initializing IPFS node at /home/user/.ipfs
generating ED25519 keypair...done
peer identity: 12D3KooWGTGTLBUZ...

To get started, enter:
    ipfs cat /ipfs/QmQPeNsJPyVWPFDVHb77w8G42Fvo15z4bG2X8D2GhfbSXc/readme
```

Test with the built-in example:

```bash
ipfs cat /ipfs/QmQPeNsJPyVWPFDVHb77w8G42Fvo15z4bG2X8D2GhfbSXc/readme
```

## Running the Daemon

Start the IPFS daemon to connect to the network:

```bash
# Start in foreground (useful for initial testing)
ipfs daemon

# You should see output like:
# Swarm listening on /ip4/0.0.0.0/tcp/4001
# RPC API server listening on /ip4/127.0.0.1/tcp/5001
# WebUI: http://127.0.0.1:5001/webui
```

The Web UI at `http://127.0.0.1:5001/webui` shows your node status, peers, and allows file browsing.

## Setting Up as a systemd Service

For a server, run the daemon as a service:

```bash
# Create a dedicated user for IPFS
sudo useradd -r -s /bin/false ipfs

# Create IPFS home directory
sudo mkdir -p /var/lib/ipfs
sudo chown ipfs:ipfs /var/lib/ipfs

# Initialize IPFS as the ipfs user
sudo -u ipfs IPFS_PATH=/var/lib/ipfs ipfs init
```

Create the systemd service:

```bash
sudo nano /etc/systemd/system/ipfs.service
```

```ini
[Unit]
Description=IPFS Daemon
Documentation=https://docs.ipfs.tech/
After=network.target

[Service]
Type=notify
Environment=IPFS_PATH=/var/lib/ipfs
User=ipfs
Group=ipfs
ExecStart=/usr/local/bin/ipfs daemon --init --migrate
Restart=on-failure
RestartSec=5

# Increase file descriptor limits for production
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ipfs
sudo systemctl start ipfs
sudo systemctl status ipfs
```

## Adding Files to IPFS

```bash
# Add a single file
ipfs add myfile.txt
# Returns: added QmHashOfYourFile myfile.txt

# Add a directory recursively
ipfs add -r ./mydir/
# Returns CIDs for each file and the directory itself

# Add and wrap in a directory (useful for serving via gateway)
ipfs add -w myfile.txt

# Show only the final CID (not per-file output)
ipfs add -q myfile.txt
```

## Reading Files from IPFS

```bash
# Read a file by CID
ipfs cat QmXnnyufdzAWL5CqZ2RnSNgidyqDe7uN41CKVb8wKB4jb8

# Save to a file
ipfs get QmXnnyufdzAWL5CqZ2RnSNgidyqDe7uN41CKVb8wKB4jb8 -o outputfile

# Read via the HTTP gateway
curl http://localhost:8080/ipfs/QmXnnyufdzAWL5CqZ2RnSNgidyqDe7uN41CKVb8wKB4jb8
```

## Pinning Files

By default, files you add are available on your node. IPFS garbage collection can remove unpinned files. Pin files you want to keep permanently:

```bash
# Pin a CID
ipfs pin add QmXnnyufdzAWL5CqZ2RnSNgidyqDe7uN41CKVb8wKB4jb8

# List pinned CIDs
ipfs pin ls

# Remove a pin (data still in cache until GC runs)
ipfs pin rm QmXnnyufdzAWL5CqZ2RnSNgidyqDe7uN41CKVb8wKB4jb8
```

Pin a CID from another node (your node fetches and pins it):

```bash
# Pin remote content - IPFS fetches it from the network
ipfs pin add QmPChd2hVbrJ6bfo3WBcTW4iZnpHm8TEzWkLHmLpXhF68A
```

## Configuring API Access

By default, the IPFS API only listens on localhost. To allow remote access:

```bash
# Edit the IPFS config
ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001

# Allow all origins for CORS (use specific origin in production)
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST"]'

# Restart the daemon for changes to take effect
sudo systemctl restart ipfs
```

Secure the API endpoint with a reverse proxy and authentication for production:

```nginx
# /etc/nginx/sites-available/ipfs-api
server {
    listen 443 ssl;
    server_name ipfs-api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/ipfs-api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ipfs-api.yourdomain.com/privkey.pem;

    # Require authentication
    auth_basic "IPFS API";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://127.0.0.1:5001;
    }
}
```

## Configuring the Gateway

The HTTP gateway lets browsers access IPFS content. Configure it:

```bash
# Make the gateway public (allows external access)
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080

# Enable the gateway (off by default for security on some versions)
ipfs config Gateway.NoFetch false
```

Access content via the gateway:

```
http://your-server:8080/ipfs/QmHash...
```

## IPNS: Mutable Names for Immutable Content

IPFS content is immutable - a CID always refers to the same bytes. IPNS (InterPlanetary Name System) provides mutable pointers that can point to different CIDs over time:

```bash
# Publish your node's current directory as an IPNS record
ipfs name publish QmXnnyufdzAWL5CqZ2RnSNgidyqDe7uN41CKVb8wKB4jb8

# Returns your IPNS address:
# Published to k51qzi5uqu5dlvj2baxnqndepeb86cbk3ng7n3i46uzyxzyqj2xjonzllnv0v8: /ipfs/QmXnny...

# Resolve an IPNS name
ipfs name resolve k51qzi5uqu5dlvj2baxnqndepeb86cbk3ng7n3i46uzyxzyqj2xjonzllnv0v8
```

IPNS records have a short TTL, so resolution can be slow. For production sites, use DNSLink:

```bash
# Add a DNS TXT record:
# _dnslink.yourdomain.com TXT "dnslink=/ipfs/QmXnny..."

# Resolve via DNS
ipfs resolve /ipns/yourdomain.com
```

## Managing Storage

IPFS accumulates data over time. Manage storage with:

```bash
# Check current storage usage
ipfs repo stat

# Set a storage limit (5 GB)
ipfs config Datastore.StorageMax 5GB

# Run garbage collection to remove unpinned blocks
ipfs repo gc

# Verify the repository
ipfs repo verify
```

## Bandwidth Configuration

Limit bandwidth for nodes with constrained connections:

```bash
# Set max bandwidth to 100 MB/s up and down
ipfs config --json Swarm.ResourceMgr.MaxMemory '"500MB"'

# Restrict to specific bandwidth
ipfs config --json Swarm.ConnMgr.HighWater 200  # max peers
ipfs config --json Swarm.ConnMgr.LowWater 150   # start pruning at this level
```

## Useful CLI Commands

```bash
# Show connected peers
ipfs swarm peers

# Show your node's addresses
ipfs id

# List files in an IPFS directory
ipfs ls QmDirectoryHash

# Show object stats (size, number of links)
ipfs object stat QmHash

# Get a file's CID without adding it
ipfs add --only-hash myfile.txt
```

## Troubleshooting

**Daemon not connecting to peers:**
```bash
# Check if swarm port is accessible
sudo ss -tlnp | grep 4001

# Allow IPFS swarm in firewall
sudo ufw allow 4001/tcp
sudo ufw allow 4001/udp

# Check connected peers
ipfs swarm peers | wc -l
```

**Content not found (slow resolution):**
IPFS content resolution depends on DHT routing. If a file was only pinned on a few nodes, it may take time to find. Check:
```bash
# Find which peers have a CID
ipfs dht findprovs QmHash
```

**Out of disk space:**
```bash
# Aggressive garbage collection
ipfs repo gc -q

# Check what's pinned
ipfs pin ls --type=recursive | wc -l
```

IPFS is well-suited for content that benefits from content-addressable integrity guarantees and distributed serving - software distribution, archival storage, or applications where multiple parties need to verify they have identical data. For everyday shared storage, JuiceFS or SeaweedFS are more operationally predictable choices.
