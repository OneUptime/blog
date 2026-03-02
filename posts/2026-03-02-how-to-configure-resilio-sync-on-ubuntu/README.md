# How to Configure Resilio Sync on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, File Sync, Networking, Linux, Storage

Description: A guide to installing and configuring Resilio Sync on Ubuntu for peer-to-peer file synchronization using the BitTorrent Sync protocol for fast, encrypted file transfer.

---

Resilio Sync (formerly BitTorrent Sync) is a proprietary peer-to-peer file synchronization application built on the BitTorrent protocol. It creates direct connections between devices to transfer files without routing through a central server. Unlike cloud sync services, there's no storage limit (beyond your own disk) and files don't live on any provider's servers.

The core sync engine is efficient - it uses the same chunked transfer approach as BitTorrent, so syncing large files is fast and resumable. The free tier has limitations (no selective sync on mobile, basic features), but for server-to-server or small team file sync, the free version is often sufficient.

## Installing Resilio Sync

Resilio provides an official APT repository for Ubuntu:

```bash
# Add the Resilio Sync repository
echo "deb http://linux-packages.resilio.com/resilio-sync/deb resilio-sync non-free" | \
    sudo tee /etc/apt/sources.list.d/resilio-sync.list

# Import the signing key
curl -LO https://linux-packages.resilio.com/resilio-sync/key.asc
sudo apt-key add key.asc

sudo apt update
sudo apt install resilio-sync

# Enable and start the service
# By default it runs as the 'rslsync' user
sudo systemctl enable --now resilio-sync

# Check status
systemctl status resilio-sync
```

## Running as a Specific User

For better control over file permissions, run Resilio Sync as your own user rather than the default `rslsync` system user:

```bash
# Method 1: Configure the default service to run as your user
sudo nano /lib/systemd/system/resilio-sync.service

# Change the User= line to your username
# User=your-username
# Group=your-username

sudo systemctl daemon-reload
sudo systemctl restart resilio-sync
```

Method 2: Run a per-user instance:

```bash
# Create a user-specific configuration
mkdir -p ~/.config/resilio-sync

# Run directly as your user
rslsync --config ~/.config/resilio-sync/sync.conf

# Create the config file first
cat > ~/.config/resilio-sync/sync.conf << 'EOF'
{
  "device_name": "my-ubuntu-server",
  "storage_path": "/home/youruser/.config/resilio-sync",
  "pid_file": "/home/youruser/.config/resilio-sync/sync.pid",
  "webui": {
    "listen": "127.0.0.1:8888",
    "login": "admin",
    "password": "changeme"
  }
}
EOF
```

## Accessing the Web Interface

Resilio Sync provides a web UI for configuration:

```bash
# The default web UI listens on port 8888
# Access via SSH tunnel if running on a remote server
ssh -L 8888:localhost:8888 user@remote-server.example.com -N

# Then open http://localhost:8888 in your browser
```

Set a password for the web interface immediately. Go to Settings -> GUI -> set username and password.

## Configuring via the Web Interface

The web UI is fairly straightforward:

1. Open the web UI at `http://localhost:8888`
2. Click "Add Folder" to set up a sync directory
3. Choose between:
   - **Standard folder** - creates a shared folder with a sync key
   - **Enter a key or link** - connect to an existing shared folder

### Standard Folder Setup

When you create a new folder, Resilio generates sync keys:
- **Read & Write key** - allows full bidirectional sync
- **Read Only key** - allows downloading only, no uploads
- **Approval key** - requires approval from an existing peer before syncing

Share the appropriate key with other devices to start syncing.

## Configuring via Config File

For headless server deployments, the JSON config file gives full control:

```bash
sudo nano /etc/resilio-sync/config.json
```

```json
{
  "device_name": "my-ubuntu-server",

  "storage_path": "/var/lib/resilio-sync",

  "pid_file": "/var/run/resilio-sync/sync.pid",

  "webui": {
    "listen": "0.0.0.0:8888",
    "login": "admin",
    "password": "strongpassword"
  },

  "shared_folders": [
    {
      "secret": "YOUR_SYNC_KEY_HERE",
      "dir": "/srv/synced-data",
      "use_relay_server": true,
      "use_tracker": true,
      "search_lan": true,
      "use_sync_trash": true,
      "overwrite_changes": false,
      "known_hosts": []
    }
  ],

  "listening_port": 55555,

  "use_upnp": false,

  "download_limit": 0,
  "upload_limit": 0,

  "folder_rescan_interval": 600,

  "lan_encrypt_data": true,

  "use_relay_server": true,
  "use_tracker": true,

  "log_size": 10,
  "log_path": "/var/log/resilio-sync"
}
```

After modifying the config, restart the service:

```bash
sudo systemctl restart resilio-sync
```

## Firewall Configuration

```bash
# Resilio Sync uses TCP and UDP on its listening port
# Default listening port is 55555 (configurable)
sudo ufw allow 55555/tcp
sudo ufw allow 55555/udp

# Allow the web UI port if needed remotely (not recommended without additional security)
# Better to use SSH tunneling instead
# sudo ufw allow 8888/tcp
```

## Adding Remote Peers

For direct connections between known servers (bypassing tracker and relay):

In the web UI, go to the shared folder settings and add known peers manually. Or in the config file:

```json
"shared_folders": [
  {
    "secret": "YOUR_SYNC_KEY",
    "dir": "/srv/synced-data",
    "known_hosts": [
      "192.168.1.50:55555",
      "203.0.113.10:55555"
    ],
    "use_tracker": false,
    "use_relay_server": false
  }
]
```

This is useful for server environments where you want deterministic connections without relying on Resilio's infrastructure.

## Excluding Files

Create a `.sync/IgnoreList` file inside any synced folder to exclude files:

```bash
# Create ignore rules for a synced folder
mkdir -p /srv/synced-data/.sync
cat > /srv/synced-data/.sync/IgnoreList << 'EOF'
# Ignore patterns (one per line, no leading slash needed)
*.log
*.tmp
.DS_Store
Thumbs.db

# Ignore a specific directory
node_modules

# Wildcards supported
build/
cache/
EOF
```

## Monitoring Sync Status

Check sync status through the web UI (the "Devices" and folder lists show connection status and sync progress), or through the API:

```bash
# Resilio Sync has an undocumented REST API
# Get a list of folders and their status
curl -s -u admin:password http://localhost:8888/api/v2/folders | python3 -m json.tool

# Get device info
curl -s -u admin:password http://localhost:8888/api/v2/os | python3 -m json.tool

# Get transfer stats
curl -s -u admin:password http://localhost:8888/api/v2/system | python3 -m json.tool
```

## Checking Logs

```bash
# View service logs
journalctl -u resilio-sync -f

# View Resilio's own log files
ls /var/lib/resilio-sync/sync.log*
tail -f /var/lib/resilio-sync/sync.log

# Debug level logging can be enabled in the web UI
# Settings -> Advanced -> Log level
```

## Upgrading Resilio Sync

```bash
# Standard upgrade through apt
sudo apt update && sudo apt upgrade resilio-sync

# Check the installed version
rslsync --help | head -5
dpkg -l resilio-sync
```

## Alternative: Using the CLI for Key Management

```bash
# Get device identity
rslsync --get-deviceid --config /etc/resilio-sync/config.json

# Generate a new folder key pair
# This is typically done through the web UI, but you can also
# use the API:
curl -s -X POST -u admin:password \
    http://localhost:8888/api/v2/folders \
    -d '{"name":"new-folder","path":"/srv/new-folder"}' | python3 -m json.tool
```

Resilio Sync works well for large-file synchronization scenarios where BitTorrent's chunked transfer approach shines. For teams already familiar with cloud sync behavior (Dropbox-like), it's an easy transition. The primary tradeoff versus open-source alternatives like Syncthing is the proprietary protocol, though Resilio's desktop and mobile apps are polished and widely used.
