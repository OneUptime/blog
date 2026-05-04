# How to Configure rsync over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rsync, IPv6, File Transfer, Backup, SSH, Linux, Networking

Description: Configure rsync to transfer files over IPv6, using both SSH tunneling and the rsync daemon, with address format handling and practical transfer examples.

---

rsync is the standard tool for efficient file transfer and backup on Linux. It supports IPv6 natively, but the address syntax differs slightly depending on whether you're using rsync over SSH or the native rsync daemon.

## rsync over SSH with IPv6

When using rsync over SSH, the IPv6 address format depends on your shell:

```bash
# Basic rsync over SSH to IPv6 host (quoting the address)

rsync -avz -e ssh \
  /local/data/ \
  user@'[2001:db8::1]':/remote/data/

# Alternative: use hostname with AAAA record
rsync -avz -e ssh \
  /local/data/ \
  user@server.example.com:/remote/data/

# Specify SSH explicitly for IPv6
rsync -avz \
  -e "ssh -6" \
  /local/data/ \
  user@'[2001:db8::1]':/remote/data/
```

## SSH Config for Easier rsync

Add IPv6 host aliases to SSH config to simplify rsync commands:

```bash
# ~/.ssh/config
Host backup-server
    HostName 2001:db8::1
    User backupuser
    IdentityFile ~/.ssh/backup_key
    AddressFamily inet6    # Force IPv6

# Now use the alias with rsync
rsync -avz /local/data/ backup-server:/remote/data/
```

## Common rsync Options for IPv6

```bash
# Sync with progress and compression
rsync -avzP \
  -e "ssh -6" \
  /source/ \
  user@'[2001:db8::1]':/destination/

# Delete files at destination that are removed from source
rsync -avz --delete \
  -e "ssh -6" \
  /source/ \
  user@'[2001:db8::1]':/destination/

# Exclude specific files or patterns
rsync -avz --exclude='*.log' --exclude='tmp/' \
  -e "ssh -6" \
  /source/ \
  user@'[2001:db8::1]':/destination/

# Dry run to preview changes
rsync -avzn \
  -e "ssh -6" \
  /source/ \
  user@'[2001:db8::1]':/destination/
```

## Running rsync Daemon over IPv6

The rsync daemon (rsyncd) can listen on IPv6:

```bash
# /etc/rsyncd.conf

# Listen on all interfaces including IPv6
address = ::
port = 873

# Global settings
max connections = 10
log file = /var/log/rsyncd.log
pid file = /var/run/rsyncd.pid

# Module definition
[backup]
    path = /data/backups
    comment = Backup storage
    read only = no
    list = yes
    # Allow IPv6 clients
    hosts allow = 2001:db8::/32 ::1
    hosts deny = *
    auth users = backupuser
    secrets file = /etc/rsyncd.secrets
```

```bash
# Create the secrets file
echo "backupuser:SecurePassword123" > /etc/rsyncd.secrets
chmod 600 /etc/rsyncd.secrets

# Start rsyncd
sudo systemctl enable --now rsync

# Verify it's listening on IPv6
ss -tlnp | grep :873
```

## Connecting to rsync Daemon over IPv6

```bash
# Connect to rsync daemon using IPv6 (double colon :: separates address and module)
rsync -avz \
  rsync://[2001:db8::1]/backup/ \
  /local/backup/

# With authentication
rsync -avz \
  --password-file=/etc/rsync.password \
  backupuser@[2001:db8::1]::backup/ \
  /local/backup/

# List available modules
rsync rsync://[2001:db8::1]/
```

## Automating IPv6 rsync Backup

```bash
#!/bin/bash
# backup_ipv6.sh - Automated rsync backup over IPv6

SOURCE="/var/www/html/"
DEST_HOST="2001:db8::backup"
DEST_PATH="/backups/webroot/"
DEST_USER="backupuser"
LOG_FILE="/var/log/backup-rsync.log"
DATE=$(date +%Y%m%d-%H%M%S)

echo "[$DATE] Starting rsync backup to [$DEST_HOST]" >> "$LOG_FILE"

rsync -avz --delete \
  -e "ssh -6 -o BatchMode=yes" \
  "$SOURCE" \
  "$DEST_USER@[$DEST_HOST]:$DEST_PATH" \
  >> "$LOG_FILE" 2>&1

EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  echo "[$DATE] Backup successful" >> "$LOG_FILE"
else
  echo "[$DATE] Backup FAILED with exit code $EXIT_CODE" >> "$LOG_FILE"
fi
```

## Firewall Rules for rsync Daemon IPv6

```bash
# Allow rsync daemon port over IPv6
sudo ip6tables -A INPUT -p tcp --dport 873 -j ACCEPT

# Restrict to specific subnet
sudo ip6tables -A INPUT -p tcp -s 2001:db8::/32 --dport 873 -j ACCEPT

sudo ip6tables-save > /etc/iptables/rules.v6
```

rsync's native IPv6 support through SSH and the rsync daemon makes it a reliable and efficient tool for file synchronization and backup operations across IPv6 networks.
