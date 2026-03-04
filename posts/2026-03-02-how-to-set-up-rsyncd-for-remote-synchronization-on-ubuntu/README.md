# How to Set Up rsyncd for Remote Synchronization on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, rsync, Networking, File Transfer, Backups

Description: Configure rsyncd, the rsync daemon, on Ubuntu to serve files over the native rsync protocol for efficient remote synchronization without requiring SSH access.

---

rsync can transfer files over SSH, which is common for ad-hoc transfers and backups. But for dedicated file distribution or synchronization servers - distributing packages, serving backups, or providing public mirrors - the native rsync daemon (rsyncd) is more efficient. It runs as a standalone service on port 873, does not require SSH, and can be configured with module-level access controls, authentication, and bandwidth limits.

## When to Use rsyncd vs rsync over SSH

Use rsyncd when:
- You have a dedicated backup or distribution server
- Multiple clients sync from the same source and you want centralized configuration
- You want anonymous read-only access (common for public mirrors)
- You need to avoid requiring SSH accounts for rsync clients
- Performance is critical (rsyncd has slightly less overhead than SSH)

Use rsync over SSH when:
- You are doing one-off transfers between systems
- Both sides already have SSH configured
- You need end-to-end encryption without additional configuration
- You do not want to run another daemon

Note: rsyncd does not encrypt traffic by default. For sensitive data, you can tunnel it through SSH or use stunnel. For public read-only mirrors, lack of encryption is usually acceptable.

## Installing rsync

```bash
# rsync is usually pre-installed on Ubuntu
which rsync
rsync --version

# Install if not present
sudo apt install rsync -y
```

## Creating the rsyncd Configuration

The main configuration file is `/etc/rsyncd.conf`:

```bash
sudo nano /etc/rsyncd.conf
```

```ini
# Global settings
uid = nobody
gid = nogroup

# Run as a standalone daemon
use chroot = yes

# Maximum simultaneous connections
max connections = 10

# Log file
log file = /var/log/rsyncd.log
log format = %t %a %m %f %b

# pid file
pid file = /run/rsyncd.pid

# Per-transfer timeout (seconds)
timeout = 300

# Address to listen on (default: all interfaces)
# address = 0.0.0.0

# Port (default: 873)
# port = 873

# [module-name] defines an rsync "module" (a named share)
[backups]
    comment = Backup Storage
    path = /srv/rsyncd/backups
    read only = no
    list = yes
    auth users = backupuser
    secrets file = /etc/rsyncd.secrets
    hosts allow = 192.168.1.0/24
    hosts deny = *

[public-data]
    comment = Public Data Mirror
    path = /srv/rsyncd/public
    read only = yes
    list = yes
    # No auth required for read-only public modules
```

## Setting Up Authentication

For modules that require authentication, create a secrets file:

```bash
# Create the secrets file
sudo nano /etc/rsyncd.secrets
```

```text
# Format: username:password
backupuser:securepassword123
sysadmin:anothersecurepassword
```

```bash
# The secrets file must be readable only by root
sudo chmod 600 /etc/rsyncd.secrets
sudo chown root:root /etc/rsyncd.secrets
```

## Creating Module Directories

```bash
# Create directories for each module
sudo mkdir -p /srv/rsyncd/backups
sudo mkdir -p /srv/rsyncd/public

# Set appropriate ownership
sudo chown nobody:nogroup /srv/rsyncd/backups
sudo chown nobody:nogroup /srv/rsyncd/public

# Set permissions
sudo chmod 755 /srv/rsyncd/public   # read-only public
sudo chmod 755 /srv/rsyncd/backups  # read-write for auth users
```

## Starting rsyncd

Ubuntu includes a systemd service for rsyncd:

```bash
# Enable rsyncd to start at boot
sudo systemctl enable rsync

# Start the service
sudo systemctl start rsync

# Check status
sudo systemctl status rsync
```

If the service is not available, check the service file name:

```bash
# Find the correct service name
sudo systemctl list-units | grep rsync

# It might be rsync.service or rsyncd.service
# Check if it exists:
sudo systemctl cat rsync
```

Alternatively, run rsyncd manually for testing:

```bash
# Run in foreground with verbose output
sudo rsync --daemon --no-detach --log-file=/dev/stdout --config=/etc/rsyncd.conf
```

## Firewall Configuration

```bash
# Allow rsync daemon port
sudo ufw allow 873/tcp

# Or limit to specific networks
sudo ufw allow from 192.168.1.0/24 to any port 873

sudo ufw status
```

## Connecting to rsyncd from Clients

The rsync URL format for daemon access is `rsync://host/module`:

```bash
# List available modules on the server
rsync rsync://192.168.1.10/

# List files in a module
rsync rsync://192.168.1.10/public-data/

# Download from a public (no-auth) module
rsync -avz rsync://192.168.1.10/public-data/ /local/data/

# Upload to an authenticated module
rsync -avz /local/backups/ backupuser@192.168.1.10::backups
# You'll be prompted for the password

# Use environment variable to avoid password prompt
RSYNC_PASSWORD=securepassword123 rsync -avz /local/backups/ backupuser@192.168.1.10::backups

# Store password in a file
echo "securepassword123" > ~/.rsync_password
chmod 600 ~/.rsync_password
rsync -avz --password-file=~/.rsync_password /local/backups/ backupuser@192.168.1.10::backups
```

Note the double colon (`::`) for daemon connections vs single colon (`:`) for SSH connections.

## Advanced Module Configuration

### Read-Write Module with Size Limits

```ini
[uploads]
    comment = Client Upload Area
    path = /srv/rsyncd/uploads
    read only = no
    list = no              # Don't show in module listing

    # Auth
    auth users = uploaduser
    secrets file = /etc/rsyncd.secrets

    # Access control
    hosts allow = 10.0.0.0/8 192.168.0.0/16
    hosts deny = *

    # Bandwidth limit (KB/s per connection)
    transfer logging = yes

    # Exclude certain files
    exclude = *.exe *.bat *.com

    # Set file permissions for uploaded files
    incoming chmod = Dg+s,ug+rw,o=r
```

### Public Read-Only Mirror

```ini
[ubuntu-mirror]
    comment = Ubuntu Package Mirror
    path = /srv/mirrors/ubuntu
    read only = yes
    list = yes

    # Allow anyone to read
    hosts allow = *

    # Don't require authentication
    # auth users is not set

    # Limit bandwidth to avoid saturating the link
    # (Not a built-in rsyncd feature, but usable with traffic shaping)

    # Exclude hidden files
    exclude = .*
```

### Module with Virtual Users

For cases where you want rsync users who are not system users:

```ini
[projects]
    comment = Project Files
    path = /srv/rsyncd/projects

    # All rsync users map to the nobody system user
    uid = nobody
    gid = nogroup

    read only = no
    list = no

    auth users = alice bob charlie
    secrets file = /etc/rsyncd.secrets
```

In `/etc/rsyncd.secrets`:
```text
alice:alicespassword
bob:bobspassword
charlie:charliespassword
```

## Setting Up Automated Synchronization

On a client that needs to sync data from rsyncd regularly:

```bash
sudo nano /usr/local/bin/sync-from-rsyncd.sh
```

```bash
#!/bin/bash
# Sync data from rsyncd server

RSYNC_SERVER="192.168.1.10"
MODULE="public-data"
LOCAL_PATH="/srv/local-mirror"
LOG_FILE="/var/log/rsync-sync.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting sync from $RSYNC_SERVER::$MODULE" >> "$LOG_FILE"

# Sync with bandwidth limiting and logging
rsync -avz --delete \
    --log-file="$LOG_FILE" \
    rsync://${RSYNC_SERVER}/${MODULE}/ \
    "${LOCAL_PATH}/"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$TIMESTAMP] Sync completed successfully" >> "$LOG_FILE"
elif [ $EXIT_CODE -eq 24 ]; then
    # Exit code 24 = some source files vanished (normal if files are being written)
    echo "[$TIMESTAMP] Sync completed with warnings (exit code 24)" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] Sync failed with exit code $EXIT_CODE" >> "$LOG_FILE"
    exit $EXIT_CODE
fi
```

```bash
sudo chmod +x /usr/local/bin/sync-from-rsyncd.sh

# Schedule to run every 6 hours
sudo crontab -e
```

Add:
```text
0 */6 * * * /usr/local/bin/sync-from-rsyncd.sh
```

## Monitoring rsyncd

```bash
# Check current connections
ss -tnp | grep :873

# Watch the transfer log
sudo tail -f /var/log/rsyncd.log

# Count transfers in the last hour
grep "$(date '+%Y/%m/%d %H')" /var/log/rsyncd.log | grep -c "sent"

# Check which modules are listed
rsync rsync://localhost/
```

## rsyncd Log Format

The default log format shows:
```text
2026/03/02 10:30:15 [12345] connect from backup-client (192.168.1.100)
2026/03/02 10:30:15 [12345] rsync on backups/ from backupuser@192.168.1.100
2026/03/02 10:30:16 [12345] sent 1048576 bytes  received 100 bytes  total size 10485760
```

For detailed per-file logging:

```ini
# In /etc/rsyncd.conf
log format = %t %a %m %f %b
transfer logging = yes
```

This adds a log line for each file transferred, showing the client address, module name, filename, and bytes transferred.

## Securing rsyncd

rsyncd transmits data unencrypted. For sensitive data, several options exist:

### Tunnel rsyncd through SSH

On the client:
```bash
# Create an SSH tunnel to the rsyncd port
ssh -L 8730:localhost:873 user@192.168.1.10 &

# Connect through the tunnel
rsync rsync://localhost:8730/module/ /local/path/

# Close the tunnel when done
kill %1
```

### Restrict Access by IP

In `/etc/rsyncd.conf`, always set `hosts allow` and `hosts deny = *`:

```ini
[sensitive-data]
    path = /srv/sensitive
    hosts allow = 192.168.1.50 192.168.1.51  # only specific hosts
    hosts deny = *
```

rsyncd is a reliable solution for serving files to multiple clients or building automated synchronization pipelines. Its native protocol is efficient, and the module system provides clean organizational structure for different data sets.
