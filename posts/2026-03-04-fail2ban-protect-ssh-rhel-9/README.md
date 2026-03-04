# How to Set Up Fail2Ban to Protect SSH on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Fail2Ban, SSH, Security, Linux

Description: Install and configure Fail2Ban on RHEL to automatically ban IP addresses that show malicious SSH behavior, with custom jail configurations and monitoring.

---

Even with key-based authentication, your SSH server still gets hammered by bots trying passwords. Every failed attempt fills your logs and wastes resources. Fail2Ban watches your auth logs and automatically bans IP addresses that fail too many times, using firewall rules.

## Installing Fail2Ban

Fail2Ban is available from the EPEL repository:

```bash
# Enable EPEL
sudo dnf install epel-release -y

# Install Fail2Ban
sudo dnf install fail2ban fail2ban-firewalld -y
```

The `fail2ban-firewalld` package provides integration with firewalld, which is the default firewall on RHEL.

## Basic Configuration

Fail2Ban's config files are in `/etc/fail2ban/`. Never edit the main files directly. Create local overrides instead.

```bash
# Create the local configuration file
sudo vi /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
# Ban duration (10 minutes)
bantime = 600

# Time window for counting failures
findtime = 600

# Number of failures before banning
maxretry = 5

# Use firewalld for banning
banaction = firewallcmd-rich-rules
banaction_allports = firewallcmd-rich-rules

# Email notifications (optional)
# destemail = admin@example.com
# sender = fail2ban@example.com
# action = %(action_mwl)s

# Ignore these IPs (never ban them)
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8

[sshd]
enabled = true
port = ssh
logpath = /var/log/secure
maxretry = 3
bantime = 3600
findtime = 600
```

## Starting Fail2Ban

```bash
# Enable and start Fail2Ban
sudo systemctl enable --now fail2ban

# Check the status
sudo systemctl status fail2ban
```

## How It Works

```mermaid
graph TD
    A[SSH Login Attempt] --> B[/var/log/secure]
    B --> C[Fail2Ban monitors log]
    C --> D{3 failures in 10 minutes?}
    D -->|No| E[Continue monitoring]
    D -->|Yes| F[Ban IP via firewalld]
    F --> G[Wait bantime]
    G --> H[Unban IP]
```

## Managing Bans

### Check the SSH jail status

```bash
sudo fail2ban-client status sshd
```

Output:

```bash
Status for the jail: sshd
|- Filter
|  |- Currently failed: 2
|  |- Total failed:     47
|  `- File list:        /var/log/secure
`- Actions
   |- Currently banned: 3
   |- Total banned:     15
   `- Banned IP list:   203.0.113.50 198.51.100.10 192.0.2.100
```

### Manually ban an IP

```bash
sudo fail2ban-client set sshd banip 203.0.113.99
```

### Manually unban an IP

```bash
sudo fail2ban-client set sshd unbanip 203.0.113.50
```

### Check if a specific IP is banned

```bash
sudo fail2ban-client get sshd banned | grep 203.0.113.50
```

## Advanced Configuration

### Progressive banning (repeat offenders)

Create a recidive jail that bans repeat offenders for longer:

```bash
sudo vi /etc/fail2ban/jail.local
```

Add:

```ini
[recidive]
enabled = true
logpath = /var/log/fail2ban.log
bantime = 604800
findtime = 86400
maxretry = 3
```

This bans IPs that get banned 3 times within 24 hours for an entire week.

### Custom SSH jail with stricter rules

```ini
[sshd-aggressive]
enabled = true
port = ssh
logpath = /var/log/secure
filter = sshd[mode=aggressive]
maxretry = 2
bantime = 86400
findtime = 3600
```

The aggressive mode catches additional patterns beyond simple password failures.

### Ban on the first attempt with invalid usernames

```ini
[sshd-invalid-user]
enabled = true
port = ssh
logpath = /var/log/secure
filter = sshd[mode=aggressive]
maxretry = 1
bantime = 3600
```

## Whitelisting Trusted IPs

Add trusted networks to the ignore list:

```ini
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16
```

Or use a file-based whitelist:

```bash
sudo vi /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
ignoreip = 127.0.0.1/8
ignorecommand = /etc/fail2ban/filter.d/ignorecommands/apache-hierarchical-ip
```

## Monitoring and Logging

### Check the Fail2Ban log

```bash
sudo tail -f /var/log/fail2ban.log
```

### View all active jails

```bash
sudo fail2ban-client status
```

### Count bans over time

```bash
# Count bans per day
sudo grep "Ban " /var/log/fail2ban.log | awk '{print $1}' | sort | uniq -c
```

### Top banned IPs

```bash
sudo grep "Ban " /var/log/fail2ban.log | awk '{print $NF}' | sort | uniq -c | sort -rn | head -20
```

## Verifying Firewall Rules

When Fail2Ban bans an IP, it adds a firewalld rich rule:

```bash
# Check firewalld for ban rules
sudo firewall-cmd --list-rich-rules
```

You should see rules like:

```bash
rule family="ipv4" source address="203.0.113.50" reject type="icmp-port-unreachable"
```

## Troubleshooting

### Fail2Ban is not banning

```bash
# Check that the log path is correct
sudo fail2ban-client get sshd logpath

# Test the filter against the log
sudo fail2ban-regex /var/log/secure /etc/fail2ban/filter.d/sshd.conf
```

### Bans are not taking effect

```bash
# Check the ban action
sudo fail2ban-client get sshd actions

# Verify firewalld is running
sudo systemctl status firewalld
```

### Fail2Ban keeps banning legitimate users

Lower the maxretry or increase findtime. Also check `ignoreip` to make sure your management network is whitelisted.

## Wrapping Up

Fail2Ban is the standard tool for protecting SSH from brute-force attacks on RHEL. Install it, configure a jail for SSH with sensible thresholds, whitelist your management IPs, and let it run. Check the status periodically to see how much garbage traffic it is blocking. Combined with key-based authentication and proper access controls, Fail2Ban adds a strong network-level defense against persistent attackers.
