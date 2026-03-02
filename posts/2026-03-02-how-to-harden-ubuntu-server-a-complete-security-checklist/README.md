# How to Harden Ubuntu Server: A Complete Security Checklist

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Hardening, Server, SSH

Description: A comprehensive security hardening checklist for Ubuntu servers covering SSH configuration, firewall setup, user management, system updates, kernel parameters, and intrusion detection.

---

Server hardening is the process of reducing your attack surface by disabling unnecessary services, tightening configurations, and adding layers of monitoring. This isn't a one-time task - it's an ongoing practice. This guide provides a structured checklist of hardening steps, from basic configuration changes that take minutes to more advanced measures worth implementing on production systems.

## 1. Keep the System Updated

The most basic hardening measure is staying current with security patches:

```bash
# Apply all pending updates
sudo apt-get update && sudo apt-get upgrade -y

# Install unattended-upgrades for automatic security updates
sudo apt-get install -y unattended-upgrades

# Configure automatic security updates
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Verify configuration
cat /etc/apt/apt.conf.d/20auto-upgrades
# Should show:
# APT::Periodic::Update-Package-Lists "1";
# APT::Periodic::Unattended-Upgrade "1";

# Test the configuration
sudo unattended-upgrade --dry-run --debug
```

## 2. Secure SSH

SSH is the most common attack vector on internet-facing servers. Locking it down is essential:

```bash
# Edit the SSH daemon configuration
sudo nano /etc/ssh/sshd_config
```

Apply these settings:

```bash
# /etc/ssh/sshd_config hardening settings

# Disable root login - always use a regular user with sudo
PermitRootLogin no

# Disable password authentication - use SSH keys only
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no

# Use SSH Protocol 2 only
Protocol 2

# Change default port to reduce automated scan noise
# Port 2222  # uncomment if changing port

# Limit authentication attempts
MaxAuthTries 3
MaxSessions 3

# Disable X11 forwarding if not needed
X11Forwarding no

# Disable .rhosts and hosts.equiv
IgnoreRhosts yes
HostbasedAuthentication no

# Restrict user logins (whitelist specific users)
AllowUsers youruser admin

# Timeout inactive sessions after 5 minutes
ClientAliveInterval 300
ClientAliveCountMax 2

# Disable unused authentication methods
KerberosAuthentication no
GSSAPIAuthentication no

# Use strong ciphers and MACs
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512
```

```bash
# Test the configuration before restarting
sudo sshd -t

# Restart SSH
sudo systemctl restart ssh
```

## 3. Configure the Firewall (UFW)

```bash
# Install UFW if not present
sudo apt-get install -y ufw

# Set default policies (deny all incoming, allow all outgoing)
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (use your custom port if you changed it)
sudo ufw allow 22/tcp    # or: sudo ufw allow 2222/tcp

# Allow only specific services you actually run
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Enable the firewall
sudo ufw enable

# Verify rules
sudo ufw status verbose
```

## 4. Set Up Fail2Ban

Fail2Ban blocks IPs that have too many failed authentication attempts:

```bash
sudo apt-get install -y fail2ban

# Create a local jail configuration (don't edit jail.conf directly)
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Key settings in `jail.local`:

```ini
[DEFAULT]
# Ban for 1 hour
bantime = 3600

# 10-minute window
findtime = 600

# 5 failures = ban
maxretry = 5

# Email notifications (configure if you have SMTP)
destemail = admin@example.com
sendername = Fail2Ban

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

```bash
# Enable and start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

## 5. User and Permission Management

```bash
# Disable unused system accounts
# List accounts with login shells
grep -vE '(false|nologin)$' /etc/passwd

# Lock accounts that shouldn't have login access
sudo usermod -L daemon
sudo usermod -L bin
sudo usermod -L sys

# Remove unused sudo permissions
sudo visudo  # review /etc/sudoers

# Check who is in the sudo group
getent group sudo

# Ensure no world-writable files in critical directories
find /etc -writable -type f 2>/dev/null

# Check for files with no owner
find / -nouser -o -nogroup 2>/dev/null | grep -v "^/proc" | grep -v "^/sys"

# Restrict su to sudo group
sudo dpkg-statoverride --update --add root sudo 4750 /bin/su
```

## 6. Kernel Hardening via sysctl

```bash
# Create a custom sysctl configuration
sudo tee /etc/sysctl.d/99-hardening.conf << 'EOF'
# IP Spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP broadcasts (Smurf attack prevention)
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Disable ICMP redirect acceptance
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Disable sending ICMP redirects
net.ipv4.conf.all.send_redirects = 0

# Enable SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Disable IP forwarding (enable only if this server routes traffic)
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# Log suspicious packets
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Protect against TIME-WAIT assassination
net.ipv4.tcp_rfc1337 = 1

# Disable IPv6 if not used
# net.ipv6.conf.all.disable_ipv6 = 1

# Prevent ptrace on processes not spawned by the tracer
kernel.yama.ptrace_scope = 1

# Restrict dmesg access to root
kernel.dmesg_restrict = 1

# Restrict /proc/sysrq-trigger
kernel.sysrq = 0

# Randomize virtual address space (ASLR)
kernel.randomize_va_space = 2
EOF

# Apply the settings
sudo sysctl -p /etc/sysctl.d/99-hardening.conf
```

## 7. File System Hardening

```bash
# Set appropriate permissions on sensitive files
sudo chmod 640 /etc/shadow
sudo chmod 644 /etc/passwd
sudo chmod 644 /etc/group
sudo chmod 600 /etc/gshadow

# Mount /tmp with restrictions
# Edit /etc/fstab to add noexec,nodev,nosuid to /tmp
sudo nano /etc/fstab
# tmpfs /tmp tmpfs defaults,nosuid,nodev,noexec 0 0

# Check for SUID/SGID binaries (review these carefully)
find / -perm /6000 -type f -exec ls -la {} \; 2>/dev/null | grep -v "^/proc"
```

## 8. Audit Logging with auditd

```bash
# Install and enable the audit daemon
sudo apt-get install -y auditd audispd-plugins

sudo systemctl enable auditd
sudo systemctl start auditd

# Add basic audit rules
sudo tee /etc/audit/rules.d/hardening.rules << 'EOF'
# Monitor file deletions
-a always,exit -F arch=b64 -S unlink -S unlinkat -S rename -S renameat -k delete

# Monitor privilege escalation
-w /bin/su -p x -k privilege_escalation
-w /usr/bin/sudo -p x -k privilege_escalation
-w /etc/sudoers -p wa -k privilege_escalation

# Monitor changes to auth files
-w /etc/passwd -p wa -k auth_changes
-w /etc/shadow -p wa -k auth_changes
-w /etc/group -p wa -k auth_changes

# Monitor SSH config changes
-w /etc/ssh/sshd_config -p wa -k ssh_config

# Monitor network configuration
-w /etc/hosts -p wa -k network
-w /etc/hostname -p wa -k network

# Log all failed system calls
-a always,exit -F arch=b64 -S all -F exit=-EACCES -k access_failure
-a always,exit -F arch=b64 -S all -F exit=-EPERM -k permission_failure
EOF

# Reload audit rules
sudo augenrules --load

# View audit log
sudo ausearch -k privilege_escalation | tail -20
```

## 9. Install an Intrusion Detection System

```bash
# Install AIDE (file integrity monitoring)
sudo apt-get install -y aide

# Initialize the AIDE database (takes a few minutes)
sudo aideinit

# Move the generated database to the reference location
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Run a check (compares current state to baseline)
sudo aide --check

# Schedule daily checks
echo "0 3 * * * root /usr/bin/aide --check | mail -s 'AIDE Report' admin@example.com" | \
    sudo tee /etc/cron.d/aide-check
```

## 10. Remove Unnecessary Services

```bash
# List all running services
sudo systemctl list-units --type=service --state=running

# Common services safe to disable on a basic server:
sudo systemctl disable --now bluetooth    # if no Bluetooth hardware
sudo systemctl disable --now cups         # printer service
sudo systemctl disable --now avahi-daemon  # mDNS/Bonjour discovery

# Check open ports and listening services
sudo ss -tlnup

# Check for services not managed by systemd
sudo netstat -tlnup  # requires net-tools
```

## 11. Security Patches for Common Services

### AppArmor

Ubuntu ships with AppArmor enabled. Verify it's active:

```bash
# Check AppArmor status
sudo aa-status

# Enable any profiles in complain mode to enforced
sudo aa-enforce /etc/apparmor.d/*

# Check for AppArmor denials
sudo dmesg | grep -i apparmor
```

### Shared Memory

```bash
# Secure shared memory
echo "tmpfs /run/shm tmpfs defaults,noexec,nosuid,nodev 0 0" | sudo tee -a /etc/fstab
sudo mount -o remount /run/shm
```

## 12. Security Auditing Tools

Run these periodically to check your security posture:

```bash
# Lynis: comprehensive security audit
sudo apt-get install -y lynis
sudo lynis audit system

# Review the report
sudo cat /var/log/lynis-report.dat | grep "suggestion\|warning"

# Debsums: verify installed package integrity
sudo apt-get install -y debsums
sudo debsums -s  # show only failures

# Tiger: security audit
sudo apt-get install -y tiger
sudo tiger
```

## Hardening Checklist Summary

After completing the above steps, verify:

- [ ] All packages updated, automatic security updates configured
- [ ] SSH key authentication only, root login disabled
- [ ] UFW firewall enabled, only required ports open
- [ ] Fail2Ban protecting SSH (and other services)
- [ ] Unnecessary user accounts locked or removed
- [ ] sysctl network parameters hardened
- [ ] SUID/SGID binaries reviewed and minimized
- [ ] auditd running with appropriate rules
- [ ] AIDE database initialized, daily checks scheduled
- [ ] Unneeded services disabled
- [ ] AppArmor enforcing profiles
- [ ] Lynis audit run and findings addressed

Run `sudo lynis audit system` periodically. The hardening index score gives a concrete metric to track improvements over time.
