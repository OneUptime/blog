# How to Configure Remote Backup Servers over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backup Server, IPv6, SSH, Rsync, Remote Backup, Linux, Security

Description: Set up and secure a remote backup server accessible over IPv6, configure client access, implement deduplication, and automate backup verification.

---

A dedicated backup server reachable only over IPv6 adds a security layer to your backup infrastructure - attackers who compromise your IPv4 network still cannot reach your backups. This guide covers setting up a hardened IPv6 backup server.

## Preparing the Backup Server

```bash
# Verify the backup server has a public IPv6 address

ip -6 addr show | grep "scope global"
# Expected: 2001:db8::1/64

# Set a static hostname
hostnamectl set-hostname backup.example.com

# Create a dedicated backup user
sudo useradd -m -s /bin/bash backupuser
sudo mkdir -p /home/backupuser/.ssh
sudo chmod 700 /home/backupuser/.ssh
```

## Configuring SSH for IPv6-Only Access

```bash
# /etc/ssh/sshd_config
# Listen on IPv6 only for backup server
ListenAddress 2001:db8::1

# Restrict access to backup user only
AllowUsers backupuser

# Use key authentication only
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# Disable root login
PermitRootLogin no

# Enable key-based only
ChallengeResponseAuthentication no

# Restrict to specific ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com
```

## Setting Up SSH Key Authentication

On each client machine that will back up to this server:

```bash
# Generate a dedicated backup SSH key on the client
ssh-keygen -t ed25519 \
  -f ~/.ssh/backup_key \
  -C "backup@clienthost-$(date +%Y%m%d)" \
  -N ""  # No passphrase for automated backups

# Copy the public key to the backup server
ssh-copy-id -i ~/.ssh/backup_key.pub \
  -o "AddressFamily inet6" \
  backupuser@[2001:db8::1]

# Test connection
ssh -6 -i ~/.ssh/backup_key backupuser@[2001:db8::1] "echo Connected"
```

## Restricting What Clients Can Do (Forced Commands)

Use forced commands to restrict what backup clients can execute:

```bash
# /home/backupuser/.ssh/authorized_keys
# Restrict each client key to rsync only
command="rsync --server --daemon .",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA... backup@client1

# Or for borg backup
command="borg serve --restrict-to-path /backups/client1",no-port-forwarding ssh-ed25519 AAAA... backup@client2
```

## Directory Structure for Multiple Clients

```bash
# Create backup directories for each client
sudo mkdir -p /backups/{client1,client2,databases}
sudo chown backupuser:backupuser /backups/*
sudo chmod 700 /backups/*

# Mount a dedicated backup volume
# /etc/fstab
# /dev/sdb1 /backups ext4 defaults,noatime 0 2
```

## Configuring Firewall for Backup Server

```bash
# IPv6 firewall: only allow SSH from trusted sources
sudo ip6tables -F
sudo ip6tables -P INPUT DROP
sudo ip6tables -P FORWARD DROP
sudo ip6tables -P OUTPUT ACCEPT

# Allow established connections
sudo ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH from specific IPv6 subnet
sudo ip6tables -A INPUT -p tcp -s 2001:db8:office::/48 --dport 22 -j ACCEPT

# Allow SSH from any IPv6 (less restrictive)
sudo ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow localhost
sudo ip6tables -A INPUT -i lo -j ACCEPT

# Save rules
sudo ip6tables-save > /etc/iptables/rules.v6
sudo systemctl enable netfilter-persistent
```

## Setting Up Client Backup via rsync

```bash
# Client-side backup script to IPv6 backup server
#!/bin/bash
# /usr/local/bin/backup-to-ipv6-server.sh

BACKUP_SERVER="2001:db8::1"
BACKUP_USER="backupuser"
SSH_KEY="$HOME/.ssh/backup_key"
REMOTE_PATH="/backups/$(hostname)"

rsync -avz \
  --delete \
  --exclude='*.tmp' \
  --exclude='/proc' \
  --exclude='/sys' \
  -e "ssh -6 -i $SSH_KEY -o BatchMode=yes" \
  / \
  "$BACKUP_USER@[$BACKUP_SERVER]:$REMOTE_PATH/" \
  2>&1 | tee -a /var/log/backup.log
```

## Monitoring Backup Server Disk Usage

```bash
#!/bin/bash
# Check backup disk usage on the IPv6 backup server
ssh -6 -i ~/.ssh/backup_key \
  backupuser@[2001:db8::1] \
  "df -h /backups && du -sh /backups/*"

# Alert if disk usage exceeds threshold
USAGE=$(ssh -6 backupuser@[2001:db8::1] "df /backups | tail -1 | awk '{print \$5}' | tr -d '%'")
if [ "$USAGE" -gt 80 ]; then
  echo "WARNING: Backup server disk at ${USAGE}% - $(date)" | \
    mail -s "Backup Server Disk Alert" admin@example.com
fi
```

A well-configured IPv6-only backup server combines network isolation with strong authentication, creating a resilient backup infrastructure where backup data is accessible only to specifically authorized clients over IPv6.
