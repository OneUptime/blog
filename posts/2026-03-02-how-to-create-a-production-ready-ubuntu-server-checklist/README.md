# How to Create a Production-Ready Ubuntu Server Checklist

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Production, Security, DevOps, Server Hardening

Description: A comprehensive production-ready Ubuntu server checklist covering security hardening, network configuration, monitoring, backups, and operational readiness for new server deployments.

---

Every production Ubuntu server should go through a baseline configuration process before handling real traffic. The exact requirements vary by use case, but certain categories of configuration apply universally: security hardening, network settings, monitoring, backups, and operational readiness. This post provides a practical checklist you can adapt for your environment.

## Initial System Setup

```bash
# Update everything first
sudo apt update && sudo apt full-upgrade -y

# Set the hostname properly
sudo hostnamectl set-hostname prod-app-01.example.com

# Verify hostname and FQDN resolution
hostname -f
hostname -s

# Set correct timezone
sudo timedatectl set-timezone UTC
timedatectl status

# Install essential tools
sudo apt install -y \
    curl wget vim git htop \
    net-tools netcat-openbsd dnsutils \
    unzip tar gzip \
    rsync \
    fail2ban ufw \
    auditd \
    logrotate
```

## User Account Configuration

```bash
# Create a non-root admin user if not already done
sudo useradd -m -s /bin/bash -G sudo admin_user
sudo passwd admin_user

# Verify sudoers configuration is correct
sudo visudo
# Ensure: %sudo   ALL=(ALL:ALL) ALL

# Disable root password login (but keep sudo)
sudo passwd -l root

# Check for accounts with empty passwords
sudo awk -F: '($2 == "" ) {print}' /etc/shadow

# Remove unnecessary users
# Review /etc/passwd for accounts not needed on this server
cat /etc/passwd | awk -F: '$3 >= 1000 {print $1}'
```

## SSH Hardening

```bash
# Create a comprehensive SSH config
sudo tee /etc/ssh/sshd_config.d/production.conf << 'EOF'
# Disable root login
PermitRootLogin no

# Disable password auth - keys only
PasswordAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no

# Use strong ciphers only
Ciphers aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr
MACs hmac-sha2-512,hmac-sha2-256

# Limit authentication attempts
MaxAuthTries 3
LoginGraceTime 60

# Idle session timeout (10 minutes)
ClientAliveInterval 600
ClientAliveCountMax 0

# Restrict SSH users if needed
# AllowUsers admin_user deploy_user

# Disable unused features
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no

# Log verbosely
LogLevel VERBOSE
EOF

# Test config before reloading
sudo sshd -t && sudo systemctl reload sshd
```

## Firewall Configuration

```bash
# Configure UFW with a default-deny policy
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if non-standard)
sudo ufw allow 22/tcp comment "SSH"

# Allow your application ports
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"

# Allow access from specific networks only (preferred for management ports)
sudo ufw allow from 10.0.0.0/8 to any port 22 comment "SSH from internal network"

# Enable UFW
sudo ufw enable
sudo ufw status verbose

# Install and configure fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Custom fail2ban config (don't modify /etc/fail2ban/jail.conf directly)
sudo tee /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = auto
ignoreip = 127.0.0.1/8 10.0.0.0/8

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
maxretry = 3
bantime = 86400
EOF

sudo systemctl restart fail2ban
```

## System Security Settings

```bash
# Kernel hardening via sysctl
sudo tee /etc/sysctl.d/99-production.conf << 'EOF'
# Network security
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.tcp_syncookies = 1

# IPv6 security (if not using IPv6)
# net.ipv6.conf.all.disable_ipv6 = 1

# Kernel hardening
kernel.randomize_va_space = 2
kernel.dmesg_restrict = 1
kernel.core_uses_pid = 1

# Prevent ptrace of processes
kernel.yama.ptrace_scope = 1
EOF

sudo sysctl --system

# Disable core dumps
sudo tee /etc/security/limits.d/production.conf << 'EOF'
# Disable core dumps for all users
* soft core 0
* hard core 0
EOF
```

## Audit Logging

```bash
# Configure auditd for basic production logging
sudo tee /etc/audit/rules.d/production.rules << 'EOF'
-D
-b 8192
-f 1

# Log authentication changes
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k sudoers

# Log sudo usage
-w /usr/bin/sudo -p x -k privileged

# Log login/logout
-w /var/log/lastlog -p wa -k logins
-w /var/run/utmp -p wa -k session

# Log network config changes
-w /etc/netplan/ -p wa -k network_config
-w /etc/hosts -p wa -k network_config
EOF

sudo augenrules --load
sudo systemctl enable auditd
sudo systemctl start auditd
```

## Automated Updates

```bash
# Configure unattended-upgrades for security patches
sudo apt install unattended-upgrades apt-listchanges -y

sudo tee /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};

// Auto-fix broken packages
Unattended-Upgrade::AutoFixInterruptedDpkg "true";

// Remove unused dependencies
Unattended-Upgrade::Remove-Unused-Dependencies "true";

// Reboot automatically if required (set to false if you manage reboots manually)
Unattended-Upgrade::Automatic-Reboot "false";

// Send email on error
Unattended-Upgrade::Mail "admin@example.com";
Unattended-Upgrade::MailReport "on-change";
EOF

sudo tee /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
EOF

sudo systemctl enable unattended-upgrades
```

## Monitoring Setup

```bash
# Install node_exporter for Prometheus metrics
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xf node_exporter-1.7.0.linux-amd64.tar.gz
sudo mv node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/

# Create systemd service for node_exporter
sudo tee /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/node_exporter
Restart=on-failure
User=nobody

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now node_exporter
sudo systemctl status node_exporter
```

## Log Management

```bash
# Configure logrotate for production logs
sudo tee /etc/logrotate.d/production << 'EOF'
/var/log/syslog
/var/log/auth.log
/var/log/kern.log
{
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        reload rsyslog >/dev/null 2>&1 || true
    endscript
}
EOF

# Verify journald is also configured for retention
sudo sed -i 's/#SystemMaxUse=/SystemMaxUse=500M/' /etc/systemd/journald.conf
sudo systemctl restart systemd-journald
```

## Time Synchronization

```bash
# Configure NTP/chrony for accurate time (critical for logs and certs)
sudo apt install chrony -y

sudo tee /etc/chrony/chrony.conf << 'EOF'
# Use pool.ntp.org or your organization's NTP servers
pool pool.ntp.org iburst maxsources 4

# Record clock drift
driftfile /var/lib/chrony/drift

# Allow step on startup if needed
makestep 1 3

# Enable kernel RTC sync
rtcsync
EOF

sudo systemctl enable chrony
sudo systemctl restart chrony

# Verify sync
chronyc tracking
chronyc sources
```

## Disk and Filesystem Checks

```bash
# Check disk usage
df -h

# Check inode usage (can fill up even if disk space is free)
df -i

# Set up automatic disk usage alerting
sudo tee /usr/local/bin/disk-check.sh << 'SCRIPT'
#!/bin/bash
# Alert if disk usage exceeds 80%
THRESHOLD=80

df -H | grep -vE '^Filesystem|tmpfs|cdrom' | while read -r LINE; do
    USAGE=$(echo "$LINE" | awk '{print $5}' | sed 's/%//')
    MOUNT=$(echo "$LINE" | awk '{print $6}')
    if [ "$USAGE" -gt "$THRESHOLD" ]; then
        echo "Disk usage alert: $MOUNT is at ${USAGE}%" | \
          mail -s "Disk Alert on $(hostname)" admin@example.com
    fi
done
SCRIPT
sudo chmod +x /usr/local/bin/disk-check.sh

# Run daily
echo "0 8 * * * root /usr/local/bin/disk-check.sh" | sudo tee /etc/cron.d/disk-check
```

## Pre-Production Verification Checklist

Run through these checks before sending traffic to the server:

```bash
#!/bin/bash
# /usr/local/bin/production-readiness-check.sh

PASS=0
FAIL=0

check() {
    local NAME="$1"
    local CMD="$2"
    if eval "$CMD" > /dev/null 2>&1; then
        echo "[PASS] $NAME"
        ((PASS++))
    else
        echo "[FAIL] $NAME"
        ((FAIL++))
    fi
}

echo "=== Production Readiness Check - $(hostname) ==="
echo ""

check "System is up to date" "[ $(apt-get -sq upgrade 2>/dev/null | grep '^[0-9]' | awk '{print $1}') -eq 0 ]"
check "UFW is active" "ufw status | grep -q 'Status: active'"
check "fail2ban is running" "systemctl is-active fail2ban"
check "auditd is running" "systemctl is-active auditd"
check "SSH root login disabled" "grep -qr 'PermitRootLogin no' /etc/ssh/"
check "SSH password auth disabled" "grep -qr 'PasswordAuthentication no' /etc/ssh/"
check "NTP sync active" "chronyc tracking | grep -q 'Leap status.*Normal'"
check "No empty passwords" "[ $(awk -F: '(\$2 == \"\") {print}' /etc/shadow | wc -l) -eq 0 ]"
check "Core dumps disabled" "grep -q '\\* hard core 0' /etc/security/limits.d/production.conf"
check "Unattended upgrades enabled" "systemctl is-active unattended-upgrades"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -gt 0 ] && exit 1 || echo "Server is production-ready."
```

This checklist covers the foundational controls. Depending on your application, you'll add service-specific configuration, backup procedures, and integration with your monitoring and alerting platform.
