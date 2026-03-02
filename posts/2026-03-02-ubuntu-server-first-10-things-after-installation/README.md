# How to Set Up Ubuntu Server After Installation: First 10 Things to Do

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Server, Security, Configuration, Post-Install

Description: A practical checklist of the first 10 configuration steps after a fresh Ubuntu Server installation, covering security hardening, updates, SSH, firewall, and monitoring.

---

A fresh Ubuntu Server installation is functional but not hardened or production-ready. Canonical ships reasonable defaults, but several important security and operational settings are either not configured or not enabled out of the box. Working through this list after every new installation takes less than 30 minutes and significantly improves your server's security posture and manageability.

## 1. Update All Packages

Do this immediately after first login. The installer downloads packages from the archive at install time, but those may already be behind. Security vulnerabilities are patched continuously.

```bash
# Update package lists and upgrade all installed packages
sudo apt update && sudo apt upgrade -y

# Remove packages that are no longer needed
sudo apt autoremove -y

# Reboot if the kernel was updated
[ -f /var/run/reboot-required ] && sudo reboot
```

Check if a reboot is needed after upgrading - kernel updates only take effect after reboot.

## 2. Configure Automatic Security Updates

Manual updates are better than nothing, but humans forget or get busy. Unattended upgrades apply security patches automatically:

```bash
# Install if not already present
sudo apt install unattended-upgrades apt-listchanges -y

# Enable automatic security updates
sudo dpkg-reconfigure --priority=low unattended-upgrades
# Select "Yes" when prompted

# Verify the configuration
cat /etc/apt/apt.conf.d/20auto-upgrades
```

The file should contain:

```
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

Customize behavior in `/etc/apt/apt.conf.d/50unattended-upgrades` - notably, you can enable automatic reboots during a maintenance window:

```bash
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
# Uncomment and set:
# Unattended-Upgrade::Automatic-Reboot "true";
# Unattended-Upgrade::Automatic-Reboot-Time "02:00";
```

## 3. Harden SSH Configuration

The default SSH configuration allows many things that should be disabled on a production server:

```bash
# Create a hardening drop-in configuration
sudo tee /etc/ssh/sshd_config.d/hardening.conf << 'EOF'
# Disable password authentication (use keys only)
PasswordAuthentication no

# Disable root login
PermitRootLogin no

# Disable empty passwords
PermitEmptyPasswords no

# Use only SSH protocol 2
Protocol 2

# Limit authentication attempts
MaxAuthTries 3

# Disconnect idle sessions after 5 minutes
ClientAliveInterval 300
ClientAliveCountMax 2

# Only allow specific users (optional - customize)
# AllowUsers youruser

# Disable X11 forwarding (unless needed)
X11Forwarding no

# Use strong key exchange algorithms
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,ecdh-sha2-nistp521
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
EOF

# Test the configuration before applying
sudo sshd -t

# Apply by restarting SSH
sudo systemctl restart ssh
```

Important: Make sure you have your SSH key set up and can authenticate before restarting SSH with password auth disabled. Test in a second terminal before closing the first.

## 4. Set Up the UFW Firewall

Ubuntu ships with UFW (Uncomplicated Firewall) but it is disabled by default. Enable it with a minimal ruleset:

```bash
# Allow SSH before enabling the firewall (do not lock yourself out)
sudo ufw allow OpenSSH

# Set default policies: deny incoming, allow outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable the firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

Add rules for any services you intend to run:

```bash
# Web server
sudo ufw allow 'Nginx Full'   # or 'Apache Full'

# Specific ports
sudo ufw allow 443/tcp
sudo ufw allow from 192.168.1.0/24 to any port 5432  # PostgreSQL from internal network only
```

## 5. Set the Correct Timezone

The default timezone is UTC, which is often preferable for servers (log timestamps in UTC are unambiguous). If you need local time:

```bash
# List available timezones
timedatectl list-timezones | grep America

# Set timezone
sudo timedatectl set-timezone America/New_York

# Verify
timedatectl status
```

Ensure NTP synchronization is active:

```bash
# Check NTP sync status
timedatectl show | grep NTP

# If not syncing, enable it
sudo timedatectl set-ntp true

# Check detailed NTP status
systemctl status systemd-timesyncd
```

## 6. Configure the Hostname

Make sure the hostname is set correctly and resolves locally:

```bash
# Check current hostname
hostnamectl

# Set a new hostname
sudo hostnamectl set-hostname server-name.example.com

# Update /etc/hosts for local resolution
sudo nano /etc/hosts
# Ensure a line like:
# 127.0.1.1  server-name.example.com server-name
```

## 7. Set Up a Static IP Address (If Needed)

Servers should have predictable IP addresses. Configure via Netplan:

```bash
# Find your interface name
ip link show

# Edit or create a Netplan configuration
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth0:                      # Replace with your actual interface name
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
        search: [example.com]
```

```bash
# Test configuration
sudo netplan try

# Apply permanently
sudo netplan apply
```

## 8. Install Fail2ban

Fail2ban monitors log files and blocks IPs that show malicious behavior (like brute-forcing SSH):

```bash
# Install fail2ban
sudo apt install fail2ban -y

# Create a local configuration (do not edit the .conf files directly)
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configure basic settings
sudo nano /etc/fail2ban/jail.local
```

Relevant settings to check in `jail.local`:

```ini
[DEFAULT]
# Ban duration in seconds (3600 = 1 hour)
bantime = 3600

# Time window for finding failures
findtime = 600

# Number of failures before banning
maxretry = 5

# Your IP addresses to never ban
ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
```

```bash
# Start and enable fail2ban
sudo systemctl enable --now fail2ban

# Check status
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

## 9. Set Up Log Management

By default, systemd-journald logs grow without bound. Set limits:

```bash
# Configure journal size limits
sudo mkdir -p /etc/systemd/journald.conf.d/
sudo tee /etc/systemd/journald.conf.d/00-journal-size.conf << 'EOF'
[Journal]
SystemMaxUse=1G
RuntimeMaxUse=200M
MaxRetentionSec=30day
EOF

sudo systemctl restart systemd-journald

# Verify current journal disk usage
journalctl --disk-usage
```

For traditional log rotation, check logrotate is configured:

```bash
# Verify logrotate is running
sudo logrotate --debug /etc/logrotate.conf

# Check rotated logs
ls -lh /var/log/
```

## 10. Set Up Monitoring and Alerting

A server you cannot monitor is a server that will surprise you. Even basic monitoring is better than none.

### Node Exporter for Prometheus

```bash
# Install node_exporter for Prometheus monitoring
sudo apt install prometheus-node-exporter -y

# Enable and start
sudo systemctl enable --now prometheus-node-exporter

# Verify it is serving metrics
curl http://localhost:9100/metrics | head -20
```

### Simple Disk and Memory Alerting Script

If you do not have a monitoring platform yet, a simple cron script that emails on problems:

```bash
# Create a basic health check script
sudo tee /usr/local/bin/health-check.sh << 'SCRIPT'
#!/bin/bash

# Check disk usage - alert if over 80%
df -h | awk 'NR>1 && $5+0 > 80 {print "DISK ALERT: " $0}' | mail -s "Disk Alert: $(hostname)" admin@example.com

# Check memory usage - alert if free < 10%
FREE=$(free | awk '/Mem/{printf "%.0f", $4/$2*100}')
[ "$FREE" -lt 10 ] && echo "Low memory: ${FREE}% free" | mail -s "Memory Alert: $(hostname)" admin@example.com

SCRIPT
sudo chmod +x /usr/local/bin/health-check.sh

# Run every 15 minutes via cron
echo "*/15 * * * * root /usr/local/bin/health-check.sh" | sudo tee /etc/cron.d/health-check
```

### Install htop for Interactive Monitoring

```bash
# Install useful monitoring tools
sudo apt install htop iotop nethogs -y

# Quick resource overview
htop

# Disk I/O by process
sudo iotop

# Network usage by process
sudo nethogs
```

## Summary Verification

After completing all steps, do a quick verification:

```bash
# Check firewall status
sudo ufw status

# Check SSH is running and configured
sudo sshd -T | grep -E "passwordauth|permitroot|maxauthtries"

# Check fail2ban
sudo fail2ban-client status sshd

# Check for pending security updates
sudo unattended-upgrade --dry-run --debug 2>&1 | grep "Packages that will be upgraded"

# Check disk space
df -h

# Check memory
free -h

# Check running services
systemctl list-units --type=service --state=running | grep -v systemd

# Check open ports
sudo ss -tlnp
```

These ten steps take a fresh Ubuntu Server installation from "it boots" to "it's ready for production use." They do not cover application-specific hardening (which depends on what you are running), but they establish a solid baseline that protects against the most common attack vectors and operational issues.
