# How to Configure Fail2Ban to Block Malicious IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fail2Ban, Linux, Security, SSH, iptables, Brute Force

Description: Install and configure Fail2Ban to automatically detect and block IP addresses that show signs of brute force attacks against SSH, web servers, and other services.

Fail2Ban monitors log files for failed authentication attempts and automatically creates iptables rules to block attacking IPs for a configurable period, stopping brute force attacks with zero manual intervention.

## Install Fail2Ban

```bash
# Debian/Ubuntu

sudo apt install fail2ban -y

# RHEL 9
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm -y
sudo dnf install fail2ban -y

# CentOS Stream 9
sudo dnf config-manager --set-enabled crb
sudo dnf install https://dl.fedoraproject.org/pub/epel/epel{,-next}-release-latest-9.noarch.rpm -y
sudo dnf install fail2ban -y

# Other RHEL-compatible distributions
sudo dnf config-manager --set-enabled crb
sudo dnf install https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm -y
sudo dnf install fail2ban -y

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Basic Configuration

Fail2Ban's main config is `/etc/fail2ban/jail.conf`. Never edit it directly - create a local override:

```bash
# Create local jail config (overrides jail.conf)
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

```ini
# /etc/fail2ban/jail.local - key defaults

[DEFAULT]
# Ban IPs for 1 hour
bantime  = 3600

# Look for failures within last 10 minutes
findtime = 600

# Ban after 5 failures
maxretry = 5

# Force IPv4 bans via iptables
banaction = iptables-multiport
banaction_allports = iptables-allports

# Never ban these IPs
ignoreip = 127.0.0.1/8 192.168.1.0/24

# Action: ban with iptables
action = %(action_)s
```

## Enable SSH Protection (sshd jail)

```ini
# /etc/fail2ban/jail.local

[sshd]
enabled  = true
port     = ssh
filter   = sshd
logpath  = %(sshd_log)s
backend  = %(sshd_backend)s
maxretry = 3
bantime  = 86400   # 24 hours for SSH attacks
findtime = 300
```

## Enable Additional Service Jails

```ini
# Protect Apache authentication endpoints
[apache-auth]
enabled  = true
port     = http,https
filter   = apache-auth
logpath  = %(apache_error_log)s
maxretry = 5

# Protect Nginx
[nginx-http-auth]
enabled  = true
port     = http,https
filter   = nginx-http-auth
logpath  = %(nginx_error_log)s
maxretry = 5

# Protect FTP
[vsftpd]
enabled  = true
port     = ftp,ftp-data,ftps,ftps-data
filter   = vsftpd
logpath  = %(vsftpd_log)s
maxretry = 3
```

## Create a Custom Filter

For applications with custom log formats:

```bash
sudo tee /etc/fail2ban/filter.d/myapp.conf > /dev/null <<'EOF'
[Definition]
failregex = ^.* Failed login from <HOST>.*$
ignoreregex =
EOF

# Test filter against log file
sudo fail2ban-regex /var/log/myapp.log /etc/fail2ban/filter.d/myapp.conf
```

## Managing Bans

```bash
# Check fail2ban status
sudo fail2ban-client status

# Check specific jail status and list banned IPs
sudo fail2ban-client status sshd

# Unban an IP
sudo fail2ban-client set sshd unbanip 1.2.3.4

# Ban an IP manually
sudo fail2ban-client set sshd banip 5.6.7.8

# Check iptables for fail2ban rules
sudo iptables -L f2b-sshd -n --line-numbers
```

## Reload and Test

```bash
# Reload configuration after changes
sudo fail2ban-client reload

# Check fail2ban logs
sudo tail -f /var/log/fail2ban.log

# Example log output:
# 2026-03-19 10:15:32 INFO [sshd] Found 1.2.3.4
# 2026-03-19 10:15:45 NOTICE [sshd] Ban 1.2.3.4
# 2026-03-19 10:15:45 INFO Creating new jail 'sshd'
```

## Longer Bans for Repeat Offenders

Use a recidive jail to ban IPs for longer periods after they have been banned multiple times:

```ini
# /etc/fail2ban/jail.local
[recidive]
enabled   = true
filter    = recidive
logpath   = /var/log/fail2ban.log
banaction = %(banaction_allports)s
bantime   = 604800   # 1 week
findtime  = 86400
maxretry  = 3
```

Fail2Ban is the most practical tool for automated IP blocking - it converts log noise into actionable firewall rules with minimal configuration.
