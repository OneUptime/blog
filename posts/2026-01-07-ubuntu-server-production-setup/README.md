# How to Set Up an Ubuntu Server from Scratch for Production Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Security, DevOps, Server Administration

Description: Set up a production-ready Ubuntu server with initial hardening, SSH key authentication, UFW firewall, fail2ban, and security best practices.

---

Setting up an Ubuntu server for production workloads requires careful attention to security, performance, and maintainability. This comprehensive guide walks you through the essential steps to transform a fresh Ubuntu installation into a hardened, production-ready server. We will cover initial access, user management, SSH hardening, firewall configuration, intrusion prevention, and monitoring basics.

## Prerequisites

Before you begin, ensure you have:

- A fresh Ubuntu Server installation (Ubuntu 22.04 LTS or 24.04 LTS recommended)
- Root or sudo access to the server
- A local machine with an SSH client installed
- Basic familiarity with Linux command-line operations

## Table of Contents

1. [Initial Server Access](#initial-server-access)
2. [System Updates](#system-updates)
3. [Creating a Non-Root User](#creating-a-non-root-user)
4. [SSH Key Configuration](#ssh-key-configuration)
5. [SSH Hardening](#ssh-hardening)
6. [UFW Firewall Configuration](#ufw-firewall-configuration)
7. [Fail2ban Installation and Configuration](#fail2ban-installation-and-configuration)
8. [Unattended Security Updates](#unattended-security-updates)
9. [Additional Security Hardening](#additional-security-hardening)
10. [Basic Monitoring Setup](#basic-monitoring-setup)
11. [Final Security Checklist](#final-security-checklist)

---

## Initial Server Access

When you first receive access to your Ubuntu server, you typically connect via SSH using the root account or an initial user provided by your hosting provider.

Connect to your server using the IP address provided:

```bash
# Replace YOUR_SERVER_IP with your actual server IP address
ssh root@YOUR_SERVER_IP
```

If your provider gave you a password, you will be prompted to enter it. Some providers use SSH keys for initial access, which is more secure.

Once connected, verify your Ubuntu version to ensure compatibility with this guide:

```bash
# Check the Ubuntu version installed on your server
lsb_release -a
```

You should see output similar to:

```
Distributor ID: Ubuntu
Description:    Ubuntu 24.04 LTS
Release:        24.04
Codename:       noble
```

---

## System Updates

Before making any configuration changes, update your system to ensure all packages are current and security patches are applied.

Update the package list and upgrade all installed packages:

```bash
# Update package list from repositories
apt update

# Upgrade all installed packages to their latest versions
apt upgrade -y

# Remove packages that are no longer required
apt autoremove -y

# Clean up the local package cache
apt autoclean
```

If a kernel update was installed, reboot the server to apply it:

```bash
# Reboot the server to apply kernel updates
reboot
```

Wait a minute or two, then reconnect via SSH.

---

## Creating a Non-Root User

Running services and performing administrative tasks as root is a significant security risk. Create a dedicated user account with sudo privileges.

Create a new user with a strong password:

```bash
# Create a new user (replace 'deploy' with your preferred username)
adduser deploy
```

You will be prompted to set a password and provide optional user information. Use a strong, unique password.

Grant the new user sudo privileges:

```bash
# Add the user to the sudo group for administrative privileges
usermod -aG sudo deploy
```

Verify the user was added to the sudo group:

```bash
# Check which groups the user belongs to
groups deploy
```

The output should include `sudo` in the list of groups.

Test the new user account by opening a new terminal and connecting:

```bash
# Connect as the new user
ssh deploy@YOUR_SERVER_IP
```

Verify sudo access works:

```bash
# Test sudo privileges (you will be prompted for your password)
sudo whoami
```

This should output `root`, confirming sudo access is working.

---

## SSH Key Configuration

Password authentication is vulnerable to brute-force attacks. SSH keys provide a more secure authentication method.

### Generate SSH Keys on Your Local Machine

If you do not already have SSH keys, generate them on your local machine:

```bash
# Generate an ED25519 SSH key pair (recommended for security)
ssh-keygen -t ed25519 -C "your_email@example.com"
```

If you need compatibility with older systems, use RSA with 4096 bits:

```bash
# Generate an RSA SSH key pair with 4096 bits
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

You will be prompted for a file location and passphrase. Using a passphrase adds an extra layer of security.

### Copy Your Public Key to the Server

Use ssh-copy-id to install your public key on the server:

```bash
# Copy your public key to the server for the deploy user
ssh-copy-id deploy@YOUR_SERVER_IP
```

Alternatively, manually copy the key if ssh-copy-id is not available:

```bash
# Display your public key (copy this output)
cat ~/.ssh/id_ed25519.pub
```

On the server, as the deploy user, create the SSH directory and authorized_keys file:

```bash
# Create the .ssh directory with correct permissions
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create the authorized_keys file and paste your public key
nano ~/.ssh/authorized_keys

# Set correct permissions on the authorized_keys file
chmod 600 ~/.ssh/authorized_keys
```

### Test SSH Key Authentication

Open a new terminal and verify you can connect without a password:

```bash
# Connect using SSH keys (should not prompt for password)
ssh deploy@YOUR_SERVER_IP
```

If successful, you will log in without entering the server password (you may still need your SSH key passphrase if you set one).

---

## SSH Hardening

Now that SSH keys are configured, harden the SSH server configuration to prevent unauthorized access.

Create a backup of the original SSH configuration:

```bash
# Backup the original sshd_config file
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
```

Edit the SSH daemon configuration:

```bash
# Open the SSH configuration file for editing
sudo nano /etc/ssh/sshd_config
```

Apply the following security settings by finding and modifying these lines (or adding them if they do not exist):

```bash
# Change the default SSH port (choose a port between 1024-65535)
# This reduces automated scanning attacks
Port 2222

# Disable root login over SSH
# Always use a regular user and sudo instead
PermitRootLogin no

# Disable password authentication (SSH keys only)
# Ensures only key-based authentication is allowed
PasswordAuthentication no

# Disable empty passwords
PermitEmptyPasswords no

# Disable challenge-response authentication
ChallengeResponseAuthentication no

# Use only SSH Protocol 2 (more secure)
Protocol 2

# Set maximum authentication attempts
MaxAuthTries 3

# Set login grace time (seconds to complete authentication)
LoginGraceTime 60

# Disable X11 forwarding unless needed
X11Forwarding no

# Disable TCP forwarding unless needed
AllowTcpForwarding no

# Disable agent forwarding unless needed
AllowAgentForwarding no

# Specify which users are allowed to connect via SSH
# Replace 'deploy' with your username
AllowUsers deploy

# Set client alive interval for idle connections (seconds)
ClientAliveInterval 300

# Set maximum client alive count before disconnection
ClientAliveCountMax 2

# Disable unused authentication methods
KerberosAuthentication no
GSSAPIAuthentication no

# Use strong key exchange algorithms
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512

# Use strong ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com

# Use strong MAC algorithms
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
```

Validate the SSH configuration before restarting:

```bash
# Test the SSH configuration for syntax errors
sudo sshd -t
```

If no errors are reported, restart the SSH service:

```bash
# Restart the SSH service to apply changes
sudo systemctl restart sshd
```

**Important**: Before closing your current SSH session, open a new terminal and test the connection with the new port:

```bash
# Test connection with the new SSH port
ssh -p 2222 deploy@YOUR_SERVER_IP
```

Only close your original session after confirming the new configuration works.

---

## UFW Firewall Configuration

Ubuntu includes UFW (Uncomplicated Firewall), which provides a user-friendly interface for managing iptables rules.

### Install and Enable UFW

UFW is typically pre-installed, but ensure it is available:

```bash
# Install UFW if not already installed
sudo apt install ufw -y
```

Check the current UFW status:

```bash
# Display current firewall status and rules
sudo ufw status verbose
```

### Configure Default Policies

Set secure default policies that deny all incoming connections and allow outgoing:

```bash
# Deny all incoming connections by default
sudo ufw default deny incoming

# Allow all outgoing connections by default
sudo ufw default allow outgoing
```

### Allow Essential Services

Allow SSH on your configured port (critical - do this before enabling UFW):

```bash
# Allow SSH connections on the custom port
# Replace 2222 with your chosen SSH port
sudo ufw allow 2222/tcp comment 'SSH'
```

Allow other services your server will provide:

```bash
# Allow HTTP traffic for web servers
sudo ufw allow 80/tcp comment 'HTTP'

# Allow HTTPS traffic for secure web servers
sudo ufw allow 443/tcp comment 'HTTPS'
```

For specific applications, allow only what is needed:

```bash
# Allow a specific port range (example for custom application)
sudo ufw allow 8000:8100/tcp comment 'Application ports'

# Allow connections from a specific IP address
sudo ufw allow from 192.168.1.100 to any port 5432 comment 'PostgreSQL from trusted IP'

# Allow a subnet access to a port
sudo ufw allow from 10.0.0.0/24 to any port 6379 comment 'Redis from internal network'
```

### Enable the Firewall

Review rules before enabling:

```bash
# Show rules that will be applied (before enabling)
sudo ufw show added
```

Enable UFW:

```bash
# Enable the firewall
# Type 'y' when prompted to confirm
sudo ufw enable
```

Verify the firewall is active:

```bash
# Display active firewall rules
sudo ufw status numbered
```

### Managing UFW Rules

View rules with numbers for easy management:

```bash
# List all rules with rule numbers
sudo ufw status numbered
```

Delete a rule by number:

```bash
# Delete rule number 3 (example)
sudo ufw delete 3
```

Delete a rule by specification:

```bash
# Delete a specific rule
sudo ufw delete allow 8080/tcp
```

Reload UFW after configuration changes:

```bash
# Reload the firewall to apply changes
sudo ufw reload
```

---

## Fail2ban Installation and Configuration

Fail2ban monitors log files and bans IP addresses that show malicious behavior, such as too many failed login attempts.

### Install Fail2ban

Install fail2ban from the Ubuntu repositories:

```bash
# Install fail2ban
sudo apt install fail2ban -y
```

Fail2ban starts automatically after installation. Check its status:

```bash
# Check fail2ban service status
sudo systemctl status fail2ban
```

### Configure Fail2ban

Never modify the default configuration files directly. Create local override files instead.

Create a local jail configuration:

```bash
# Create a local jail configuration file
sudo nano /etc/fail2ban/jail.local
```

Add the following configuration:

```ini
# Fail2ban local configuration
# This file overrides settings in jail.conf

[DEFAULT]
# Ban duration in seconds (1 hour)
bantime = 3600

# Time window for counting failures (10 minutes)
findtime = 600

# Number of failures before ban
maxretry = 5

# Email settings for notifications (optional)
# destemail = admin@yourdomain.com
# sender = fail2ban@yourdomain.com
# mta = sendmail

# Action to take when banning
# Ban and send an email with whois report and log lines
banaction = iptables-multiport
banaction_allports = iptables-allports

# Default action (ban only, no email)
action = %(action_)s

# Ignore local and trusted IPs
ignoreip = 127.0.0.1/8 ::1

[sshd]
# Enable SSH jail
enabled = true

# Use aggressive mode for better detection
mode = aggressive

# SSH port (update to match your SSH port)
port = 2222

# Log file to monitor
logpath = /var/log/auth.log

# SSH-specific settings
maxretry = 3
findtime = 300
bantime = 86400

# Backend for monitoring log files
backend = systemd
```

### Create Custom Filters (Optional)

Create additional jails for other services. For example, protect a web application:

```bash
# Create a custom filter for repeated 404 errors (potential scanning)
sudo nano /etc/fail2ban/filter.d/nginx-404.conf
```

Add the filter definition:

```ini
# Fail2ban filter for nginx 404 errors
# Bans IPs that generate too many 404 errors (scanning behavior)

[Definition]
failregex = ^<HOST> - .* "(GET|POST|HEAD).*" 404 .*$
ignoreregex =
```

Create a jail for the custom filter:

```bash
# Add to /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Append the following:

```ini
[nginx-404]
enabled = true
port = http,https
filter = nginx-404
logpath = /var/log/nginx/access.log
maxretry = 10
findtime = 60
bantime = 3600
```

### Restart and Verify Fail2ban

Apply the configuration changes:

```bash
# Restart fail2ban to apply new configuration
sudo systemctl restart fail2ban
```

Verify jails are active:

```bash
# Check status of all jails
sudo fail2ban-client status
```

Check a specific jail:

```bash
# Check the SSH jail status
sudo fail2ban-client status sshd
```

### Managing Banned IPs

View banned IPs for a jail:

```bash
# List banned IPs for the SSH jail
sudo fail2ban-client status sshd
```

Manually unban an IP address:

```bash
# Unban a specific IP address
sudo fail2ban-client set sshd unbanip 192.168.1.100
```

Manually ban an IP address:

```bash
# Ban a specific IP address
sudo fail2ban-client set sshd banip 192.168.1.200
```

---

## Unattended Security Updates

Configure automatic security updates to keep your server protected against vulnerabilities.

### Install Unattended Upgrades

Install the unattended-upgrades package:

```bash
# Install unattended-upgrades package
sudo apt install unattended-upgrades apt-listchanges -y
```

### Configure Automatic Updates

Run the initial configuration:

```bash
# Enable automatic updates interactively
sudo dpkg-reconfigure -plow unattended-upgrades
```

Select "Yes" when prompted.

Customize the unattended-upgrades configuration:

```bash
# Edit the unattended-upgrades configuration
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Modify these settings for production use:

```
// Automatically upgrade packages from these origins
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

// Remove unused kernel packages after upgrade
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";

// Remove unused dependencies after upgrade
Unattended-Upgrade::Remove-Unused-Dependencies "true";

// Automatically reboot if required (set time to minimize impact)
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";

// Send email notifications (optional)
// Unattended-Upgrade::Mail "admin@yourdomain.com";
// Unattended-Upgrade::MailReport "on-change";

// Enable logging
Unattended-Upgrade::SyslogEnable "true";
Unattended-Upgrade::SyslogFacility "daemon";
```

Configure the update schedule:

```bash
# Edit the auto-upgrades configuration
sudo nano /etc/apt/apt.conf.d/20auto-upgrades
```

Ensure these settings are present:

```
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
```

### Verify Automatic Updates

Test the unattended-upgrades configuration:

```bash
# Perform a dry run to test configuration
sudo unattended-upgrades --dry-run --debug
```

Check the unattended-upgrades log:

```bash
# View the unattended-upgrades log
sudo cat /var/log/unattended-upgrades/unattended-upgrades.log
```

---

## Additional Security Hardening

Implement additional security measures to further protect your server.

### Secure Shared Memory

Shared memory can be exploited in certain attacks. Secure it by mounting with noexec:

```bash
# Edit the fstab file
sudo nano /etc/fstab
```

Add the following line:

```
# Secure shared memory
tmpfs /run/shm tmpfs defaults,noexec,nosuid 0 0
```

Apply the changes:

```bash
# Remount shared memory with new options
sudo mount -o remount /run/shm
```

### Disable Unused Network Protocols

Create a configuration file to disable IPv6 if not needed:

```bash
# Create sysctl configuration for network security
sudo nano /etc/sysctl.d/99-security.conf
```

Add the following settings:

```bash
# Disable IPv6 if not required
# net.ipv6.conf.all.disable_ipv6 = 1
# net.ipv6.conf.default.disable_ipv6 = 1

# Ignore ICMP redirects (prevents MITM attacks)
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Enable TCP SYN cookies (protects against SYN flood attacks)
net.ipv4.tcp_syncookies = 1

# Log suspicious packets
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Ignore broadcast ICMP requests
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Ignore bogus ICMP error responses
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Enable reverse path filtering
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Increase system file descriptor limit
fs.file-max = 65535

# Increase socket buffer sizes for better network performance
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
```

Apply the sysctl settings:

```bash
# Apply new sysctl settings
sudo sysctl -p /etc/sysctl.d/99-security.conf
```

### Secure Boot Settings

Protect the GRUB bootloader with a password:

```bash
# Generate a GRUB password hash
grub-mkpasswd-pbkdf2
```

Save the generated hash and add it to GRUB configuration:

```bash
# Edit GRUB configuration
sudo nano /etc/grub.d/40_custom
```

Add the following (replace HASH with your generated hash):

```bash
set superusers="admin"
password_pbkdf2 admin HASH
```

Update GRUB:

```bash
# Update GRUB configuration
sudo update-grub
```

### Disable Unnecessary Services

List all running services:

```bash
# List all active services
sudo systemctl list-units --type=service --state=active
```

Disable services you do not need:

```bash
# Example: Disable cups (printing service) if not needed
sudo systemctl disable cups
sudo systemctl stop cups

# Example: Disable avahi-daemon (mDNS) if not needed
sudo systemctl disable avahi-daemon
sudo systemctl stop avahi-daemon
```

### Set Up Audit Logging

Install and configure auditd for comprehensive system auditing:

```bash
# Install the audit daemon
sudo apt install auditd audispd-plugins -y
```

Enable and start the audit service:

```bash
# Enable auditd to start on boot
sudo systemctl enable auditd

# Start the audit daemon
sudo systemctl start auditd
```

Create custom audit rules:

```bash
# Edit audit rules
sudo nano /etc/audit/rules.d/audit.rules
```

Add rules to monitor critical files and actions:

```bash
# Monitor changes to authentication files
-w /etc/passwd -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/gshadow -p wa -k identity

# Monitor SSH configuration changes
-w /etc/ssh/sshd_config -p wa -k sshd_config

# Monitor sudoers file changes
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers

# Monitor network configuration changes
-w /etc/hosts -p wa -k hosts
-w /etc/network/ -p wa -k network

# Monitor system startup scripts
-w /etc/init.d/ -p wa -k init
-w /etc/systemd/ -p wa -k systemd

# Monitor cron configuration
-w /etc/crontab -p wa -k cron
-w /etc/cron.d/ -p wa -k cron

# Log all commands executed as root
-a always,exit -F arch=b64 -F euid=0 -S execve -k root_commands
```

Restart auditd to apply rules:

```bash
# Restart the audit daemon
sudo systemctl restart auditd
```

View audit logs:

```bash
# View recent audit events
sudo ausearch -ts recent
```

---

## Basic Monitoring Setup

Implement basic monitoring to track server health and detect issues early.

### Install Essential Monitoring Tools

Install commonly used monitoring utilities:

```bash
# Install monitoring tools
sudo apt install htop iotop iftop nethogs sysstat -y
```

### Enable System Statistics Collection

Enable sysstat for historical performance data:

```bash
# Enable sysstat data collection
sudo nano /etc/default/sysstat
```

Change `ENABLED="false"` to:

```
ENABLED="true"
```

Start the sysstat service:

```bash
# Restart sysstat to begin collection
sudo systemctl restart sysstat
sudo systemctl enable sysstat
```

### Monitor Disk Space

Create a simple disk space monitoring script:

```bash
# Create a disk monitoring script
sudo nano /usr/local/bin/check-disk-space.sh
```

Add the following script:

```bash
#!/bin/bash
# Disk space monitoring script
# Sends alert when disk usage exceeds threshold

THRESHOLD=80
EMAIL="admin@yourdomain.com"

# Check each mounted filesystem
df -H | grep -vE '^Filesystem|tmpfs|cdrom' | awk '{ print $5 " " $1 }' | while read output;
do
    usage=$(echo $output | awk '{ print $1}' | cut -d'%' -f1)
    partition=$(echo $output | awk '{ print $2 }')

    if [ $usage -ge $THRESHOLD ]; then
        echo "WARNING: $partition is ${usage}% full on $(hostname)" | \
            mail -s "Disk Space Alert: $(hostname)" $EMAIL
    fi
done
```

Make the script executable and schedule it:

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/check-disk-space.sh

# Add to crontab (run every hour)
sudo crontab -e
```

Add this line:

```
0 * * * * /usr/local/bin/check-disk-space.sh
```

### Set Up Log Rotation

Ensure logs do not consume all disk space:

```bash
# View current logrotate configuration
cat /etc/logrotate.conf
```

Create custom log rotation for application logs:

```bash
# Create custom logrotate configuration
sudo nano /etc/logrotate.d/custom-apps
```

Example configuration:

```
/var/log/myapp/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload myapp > /dev/null 2>&1 || true
    endscript
}
```

### Monitor Authentication Attempts

View failed login attempts:

```bash
# Show recent failed SSH login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# Show successful logins
sudo grep "Accepted" /var/log/auth.log | tail -20
```

Create a simple login monitoring script:

```bash
# Create login monitoring script
sudo nano /usr/local/bin/monitor-logins.sh
```

Add the script:

```bash
#!/bin/bash
# Monitor SSH login attempts

echo "=== Failed Login Attempts (Last 24 hours) ==="
sudo grep "Failed password" /var/log/auth.log | \
    grep "$(date -d '1 day ago' '+%b %d')\|$(date '+%b %d')"

echo ""
echo "=== Successful Logins (Last 24 hours) ==="
sudo grep "Accepted" /var/log/auth.log | \
    grep "$(date -d '1 day ago' '+%b %d')\|$(date '+%b %d')"

echo ""
echo "=== Currently Logged In Users ==="
who

echo ""
echo "=== Fail2ban Banned IPs ==="
sudo fail2ban-client status sshd | grep "Banned IP"
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/monitor-logins.sh
```

---

## Final Security Checklist

Before considering your server production-ready, verify the following:

### SSH Security

```bash
# Verify SSH configuration
sudo sshd -T | grep -E 'permitrootlogin|passwordauthentication|port'
```

Expected output:

```
port 2222
permitrootlogin no
passwordauthentication no
```

### Firewall Status

```bash
# Verify firewall is active with correct rules
sudo ufw status verbose
```

### Fail2ban Status

```bash
# Verify fail2ban is running
sudo fail2ban-client status
```

### Automatic Updates

```bash
# Verify unattended-upgrades is enabled
sudo systemctl status unattended-upgrades
```

### System Audit

```bash
# Verify auditd is running
sudo systemctl status auditd
```

### Security Summary Commands

Run this comprehensive security check:

```bash
#!/bin/bash
# Security status summary script

echo "=== Security Status Summary ==="
echo ""

echo "1. SSH Configuration:"
echo "   Port: $(sudo sshd -T | grep '^port' | awk '{print $2}')"
echo "   Root Login: $(sudo sshd -T | grep '^permitrootlogin' | awk '{print $2}')"
echo "   Password Auth: $(sudo sshd -T | grep '^passwordauthentication' | awk '{print $2}')"
echo ""

echo "2. Firewall Status:"
sudo ufw status | head -5
echo ""

echo "3. Fail2ban Status:"
sudo fail2ban-client status | grep "Number of jail"
echo ""

echo "4. Last 5 Failed Login Attempts:"
sudo grep "Failed password" /var/log/auth.log | tail -5
echo ""

echo "5. System Updates:"
apt list --upgradable 2>/dev/null | head -10
echo ""

echo "6. Listening Ports:"
sudo ss -tlnp | grep LISTEN
echo ""

echo "=== End of Security Summary ==="
```

---

## Next Steps

With your Ubuntu server now hardened for production, consider these additional improvements:

1. **Application-Level Security**: Configure application firewalls (ModSecurity for web apps)
2. **Centralized Logging**: Set up remote syslog or a log aggregation system
3. **Intrusion Detection**: Deploy AIDE or OSSEC for file integrity monitoring
4. **Backup Strategy**: Implement automated backups with offsite storage
5. **Monitoring Platform**: Deploy a comprehensive monitoring solution like OneUptime
6. **Container Security**: If using Docker, apply container-specific hardening
7. **Network Segmentation**: Use VLANs or VPNs for sensitive services
8. **Vulnerability Scanning**: Regularly scan with tools like Lynis or OpenVAS

## Conclusion

Setting up a production-ready Ubuntu server requires attention to multiple security layers. By following this guide, you have implemented:

- Non-root user access with sudo privileges
- SSH key-based authentication with hardened configuration
- UFW firewall with minimal open ports
- Fail2ban for intrusion prevention
- Automatic security updates
- Kernel-level security hardening
- Basic monitoring and auditing

Remember that security is an ongoing process. Regularly review logs, update your systems, and stay informed about new vulnerabilities and best practices. A well-maintained server is a secure server.

## Related Resources

- [Ubuntu Server Documentation](https://ubuntu.com/server/docs)
- [OpenSSH Security Best Practices](https://www.openssh.com/)
- [Fail2ban Documentation](https://www.fail2ban.org/)
- [UFW Documentation](https://help.ubuntu.com/community/UFW)
- [CIS Ubuntu Benchmarks](https://www.cisecurity.org/benchmark/ubuntu_linux)
