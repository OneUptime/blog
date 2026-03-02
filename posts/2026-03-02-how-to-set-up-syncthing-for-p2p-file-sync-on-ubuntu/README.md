# How to Set Up Syncthing for P2P File Sync on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, File Sync, Networking, Syncthing, Linux

Description: Learn how to install and configure Syncthing on Ubuntu for peer-to-peer file synchronization between devices without relying on a central server or cloud storage provider.

---

Syncthing synchronizes files between devices directly, peer-to-peer, without routing data through any central server. Each device holds all the data, there's no mandatory cloud account, and the sync protocol is open and documented. It works well for keeping directories in sync between servers, desktop machines, and anything in between.

The practical difference from cloud sync services: your data never touches someone else's server. Syncthing has discovery servers and relay servers (for when peers can't connect directly) that are operated by the Syncthing project, but they're optional and you can run your own, and they never see your file contents.

## Installing Syncthing

```bash
# Add the Syncthing repository
curl -s https://syncthing.net/release-key.txt | sudo gpg --dearmor -o /usr/share/keyrings/syncthing.gpg

echo "deb [signed-by=/usr/share/keyrings/syncthing.gpg] https://apt.syncthing.net/ syncthing stable" | \
    sudo tee /etc/apt/sources.list.d/syncthing.list

sudo apt update
sudo apt install syncthing

# Verify installation
syncthing --version
```

## Running Syncthing as a User Service

Syncthing is typically run as a regular user, not root. This keeps file ownership sane and is the recommended approach:

```bash
# Start and enable the user service for your current user
systemctl --user enable --now syncthing

# Check status
systemctl --user status syncthing

# View logs
journalctl --user -u syncthing -f
```

To run Syncthing as a system service (useful for servers where no user is logged in):

```bash
# Enable Syncthing for a specific user at the system level
sudo systemctl enable --now syncthing@your-username

# Check status
systemctl status syncthing@your-username

# View logs
journalctl -u syncthing@your-username -f
```

## Accessing the Web UI

Syncthing has a web interface that listens on `localhost:8384` by default. If you're running it on a remote server, use an SSH tunnel to access it:

```bash
# On your local machine, create a tunnel
ssh -L 8384:localhost:8384 user@remote-server.example.com -N

# Then open http://localhost:8384 in your browser
```

For direct remote access, configure Syncthing to listen on a non-localhost address (consider securing this with a password):

```bash
# Edit the configuration file
nano ~/.config/syncthing/config.xml

# Find the <gui> section and change:
# <address>127.0.0.1:8384</address>
# to:
# <address>0.0.0.0:8384</address>

# Also set a strong password in the GUI first
```

Set a GUI password in the web interface before exposing it: Settings -> GUI -> GUI Authentication Password.

## Understanding Syncthing Concepts

Before configuring shared folders, understand the key concepts:

- **Device ID** - a long alphanumeric identifier derived from your device's TLS certificate. You share this with other devices to connect.
- **Folder** - a directory you want to sync. Each folder has an ID that must match across devices sharing it.
- **Share type** - can be Send & Receive (bidirectional), Send Only (this device pushes only), or Receive Only (this device pulls only)
- **Ignores** - `.stignore` files (similar to `.gitignore`) that exclude specific files or patterns

## Adding a Device

To sync between two Ubuntu machines:

1. Open the web UI on both machines (`http://localhost:8384`)
2. On machine A, find the Device ID: Actions menu -> Show ID, or from the CLI:

```bash
# Get the device ID from the command line
syncthing -device-id
```

3. On machine B, click "Add Remote Device", paste machine A's Device ID, give it a name
4. Machine A will receive an alert asking to accept the connection from machine B
5. Accept on machine A

Both devices now know about each other but aren't syncing anything yet.

## Setting Up a Shared Folder

On machine A:
1. Click "Add Folder"
2. Set the Folder Path (must be an existing directory or Syncthing will create it)
3. The Folder ID auto-generates or you can set a meaningful one
4. Under "Sharing" tab, check the box for machine B
5. Save

Machine B will see a notification offering to add the folder. Accept it and specify where to store the files on machine B.

From the CLI using the REST API:

```bash
# Syncthing exposes a REST API on the same port as the GUI
# Get your API key from the GUI: Actions -> Settings -> API Key

API_KEY="your-api-key-here"

# List current folders
curl -s -H "X-API-Key: $API_KEY" http://localhost:8384/rest/config/folders | python3 -m json.tool

# List connected devices
curl -s -H "X-API-Key: $API_KEY" http://localhost:8384/rest/config/devices | python3 -m json.tool

# Get sync status
curl -s -H "X-API-Key: $API_KEY" http://localhost:8384/rest/db/status?folder=your-folder-id | python3 -m json.tool
```

## Using .stignore Files

Create a `.stignore` file in any synced folder to exclude files:

```bash
# Example .stignore file in your synced directory
cat > ~/synced-folder/.stignore << 'EOF'
# Exclude build artifacts
build/
dist/
*.o
*.pyc

# Exclude editor temporary files
*.swp
*.swo
.DS_Store
Thumbs.db

# Exclude logs
*.log
logs/

# Exclude secrets
.env
*.pem
*.key

# Include a previously excluded pattern (override)
!important-build.log
EOF
```

Patterns support:
- `*` - matches any single path component
- `**` - matches any sequence of path components
- `!` prefix - negates (re-includes) a pattern
- `/` prefix - anchors to the folder root

## Running Without the Discovery Servers

For environments where you don't want to use Syncthing's discovery infrastructure:

```bash
# In the GUI: Actions -> Settings -> Connections
# Disable Global Discovery
# Disable Relay Servers

# Add devices manually by IP in the device configuration:
# Device -> Edit -> Add address: tcp://192.168.1.50:22000
```

Or configure static addresses in the config file:

```xml
<!-- In ~/.config/syncthing/config.xml -->
<device id="DEVICE-ID-HERE" name="server2">
    <address>tcp://192.168.1.50:22000</address>
</device>
```

## Firewall Configuration

```bash
# Syncthing uses:
# 22000/tcp - syncing traffic between devices
# 22000/udp - relay transport
# 21027/udp - local device discovery (broadcast)

sudo ufw allow 22000/tcp
sudo ufw allow 22000/udp
sudo ufw allow 21027/udp

# If exposing the web GUI (not recommended without additional auth)
sudo ufw allow 8384/tcp
```

## Running Your Own Discovery and Relay Servers

For fully self-hosted operation:

```bash
# Install the discovery server
go install github.com/syncthing/syncthing/cmd/stdiscosrv@latest

# Install the relay server
go install github.com/syncthing/syncthing/cmd/strelaysrv@latest

# Run the discovery server
stdiscosrv --listen=:8443 --db-dir=/var/lib/syncthing-discovery

# Run the relay server
strelaysrv --listen=:22067 --status-srv=:22070
```

Then configure Syncthing to use your servers. In the web GUI under Settings -> Connections:
- Global Discovery Servers: `https://your-discovery-server:8443/v2/?id=SERVER_ID`
- Add relay server: `relay://your-relay-server:22067/?id=RELAY_ID`

## Monitoring Sync Status

```bash
# Check overall status via REST API
API_KEY="your-api-key"

# Completion percentage for each folder
curl -s -H "X-API-Key: $API_KEY" \
    "http://localhost:8384/rest/db/completion?folder=default" | python3 -m json.tool

# System statistics
curl -s -H "X-API-Key: $API_KEY" \
    "http://localhost:8384/rest/system/status" | python3 -m json.tool

# Recent events (file changes, errors, etc.)
curl -s -H "X-API-Key: $API_KEY" \
    "http://localhost:8384/rest/events?limit=20" | python3 -m json.tool
```

## Troubleshooting

```bash
# Check Syncthing version and config path
syncthing --version

# Reset the index database (fixes some "stuck" sync issues)
# Stop Syncthing first
systemctl --user stop syncthing
# Then delete the index database (safe - it rebuilds on next start)
rm -rf ~/.config/syncthing/index-v0.14.0.db/
systemctl --user start syncthing

# Check for conflicts
# Files that couldn't sync cleanly get renamed with .sync-conflict in the name
find ~/synced-folder -name "*.sync-conflict*"

# Verify firewall isn't blocking
sudo ufw status verbose
nc -zv remote-device 22000
```

Syncthing's decentralized approach means there's no single point of failure, no subscription, and no upload/download limits beyond your own bandwidth. For syncing files between a set of trusted machines you control, it's one of the most straightforward solutions available.
