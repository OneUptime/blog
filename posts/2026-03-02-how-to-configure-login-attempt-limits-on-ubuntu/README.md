# How to Configure Login Attempt Limits on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, SSH, Authentication, Hardening

Description: Practical guide to limiting login attempts on Ubuntu through SSH configuration, PAM settings, and fail2ban, protecting systems from brute force and credential stuffing attacks.

---

Unrestricted login attempts give attackers unlimited opportunities to try passwords. On any publicly reachable Ubuntu system, automated bots continuously probe SSH and other services with credential lists. Limiting the number of login attempts - and reacting appropriately when limits are hit - is a fundamental defensive measure.

This article covers several complementary approaches: SSH-native rate limiting, PAM-based controls, and fail2ban for IP-level blocking.

## SSH-Level Login Attempt Controls

The OpenSSH server has built-in settings that limit authentication attempts per connection. These work independently of PAM and are the first line of defense.

### MaxAuthTries

This setting limits how many authentication attempts are allowed per connection before the server drops it:

```bash
sudo nano /etc/ssh/sshd_config
```

```ini
# Maximum authentication attempts per connection
# Default is 6; reduce to 3 for stricter enforcement
MaxAuthTries 3

# Maximum simultaneous unauthenticated connections
# Format: start:rate:full
# 10:30:60 means: at 10 connections start dropping 30% of new ones,
# at 60 connections drop all new ones
MaxStartups 10:30:60

# Disconnect client if not authenticated within this many seconds
LoginGraceTime 30

# Limit the number of open sessions per connection
MaxSessions 2
```

Apply the configuration:

```bash
sudo sshd -t  # Test for syntax errors
sudo systemctl reload sshd
```

### Restricting Login to Specific Users

Reducing the attack surface means fewer accounts to brute force:

```bash
# Allow only specific users to SSH
# Put this in /etc/ssh/sshd_config
AllowUsers deploy ansible nagios

# Or allow entire groups
AllowGroups sshusers sudo

# Deny specific users
DenyUsers nobody www-data
```

### Rate Limiting with iptables

Before SSH even sees the connection, iptables can drop excessive connection attempts from a single IP:

```bash
# Limit SSH connections to 4 per minute per source IP
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW \
  -m recent --set --name SSH

sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW \
  -m recent --update --seconds 60 --hitcount 4 --name SSH -j DROP

# View the rule
sudo iptables -L INPUT -n -v | grep -A 2 "dpt:22"

# Make the rules persistent
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

For UFW users, the same rate limit is simpler:

```bash
# UFW's rate limit automatically blocks IPs with more than 6 connections
# in 30 seconds
sudo ufw limit ssh
sudo ufw reload

# View UFW status
sudo ufw status verbose
```

## PAM-Based Attempt Limiting

PAM's `pam_faillock` module enforces attempt limits at the operating system level, affecting all services that use PAM for authentication.

### Configuring pam_faillock

```bash
sudo nano /etc/security/faillock.conf
```

```ini
# /etc/security/faillock.conf

# Lock account after this many failures
deny = 5

# Reset counter after this many seconds without failure (15 minutes)
fail_interval = 900

# Keep account locked for this many seconds (0 = permanent until admin unlocks)
unlock_time = 600

# Apply lockout to root too
even_deny_root = true
root_unlock_time = 120

# Enable audit logging of lockout events
audit = true
```

The PAM stack must reference faillock in the auth section of `/etc/pam.d/common-auth`:

```
auth  required  pam_faillock.so preauth
auth  [success=1 default=ignore]  pam_unix.so nullok
auth  [default=die]  pam_faillock.so authfail
auth  sufficient  pam_faillock.so authsucc
auth  requisite  pam_deny.so
auth  required   pam_permit.so
```

### Monitoring Failure Counts

```bash
# Check failure count for a specific user
sudo faillock --user username

# View all users with recorded failures
sudo faillock

# Reset a locked account
sudo faillock --user username --reset
```

## fail2ban - IP-Level Blocking

While pam_faillock locks user accounts, it does nothing about the attacking IP. `fail2ban` watches log files and inserts firewall rules to ban IPs that exceed attempt thresholds.

### Installing fail2ban

```bash
sudo apt-get update
sudo apt-get install -y fail2ban

# Enable at boot
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Configuring fail2ban for SSH

Never edit `/etc/fail2ban/jail.conf` directly - it gets overwritten on updates. Use `.local` override files:

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
# Ban IPs for 1 hour
bantime = 3600

# Look back 10 minutes when counting failures
findtime = 600

# Allow 5 retries before banning
maxretry = 5

# Ignore these IPs (your own management IP goes here)
ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24

# Use aggressive banning (incremental ban times for repeat offenders)
bantime.increment = true
bantime.factor = 24
bantime.maxtime = 604800  # 1 week max ban

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200
```

### Creating a Custom fail2ban Filter

For services without a built-in filter:

```bash
# Create a filter for a custom application
sudo nano /etc/fail2ban/filter.d/myapp.conf
```

```ini
[INCLUDES]
before = common.conf

[Definition]
# Match lines like: 2026-03-02 10:15:22 FAILED login for user 'admin' from 10.0.0.5
_daemon = myapp
failregex = ^%(__prefix_line)sFAILED login for user .* from <HOST>\s*$
ignoreregex =
```

```bash
# Add the jail for this app
sudo nano /etc/fail2ban/jail.d/myapp.conf
```

```ini
[myapp]
enabled = true
filter = myapp
logpath = /var/log/myapp/access.log
maxretry = 5
findtime = 300
bantime = 3600
```

```bash
sudo systemctl reload fail2ban
```

### Managing fail2ban

```bash
# Check status of all jails
sudo fail2ban-client status

# Check which IPs are banned for SSH
sudo fail2ban-client status sshd

# Unban a specific IP
sudo fail2ban-client set sshd unbanip 203.0.113.50

# Test a filter against a log file
sudo fail2ban-regex /var/log/auth.log /etc/fail2ban/filter.d/sshd.conf
```

## Monitoring Login Attempts

With controls in place, monitoring gives visibility into what is actually hitting your system:

```bash
# Count failed SSH attempts by source IP (last 1000 lines)
sudo grep 'Failed password' /var/log/auth.log | \
  awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head -20

# Count failed attempts by username
sudo grep 'Failed password' /var/log/auth.log | \
  awk '{print $9}' | sort | uniq -c | sort -rn | head -20

# Show all authentication successes
sudo grep 'Accepted' /var/log/auth.log | tail -20

# Watch auth log in real time
sudo tail -f /var/log/auth.log | grep -E 'Failed|Invalid|Accepted'
```

## Changing the SSH Port

Moving SSH off port 22 significantly reduces automated attack volume. It is not a security control on its own, but it reduces log noise dramatically:

```bash
sudo nano /etc/ssh/sshd_config
```

```
Port 2222
```

Update UFW:

```bash
sudo ufw allow 2222/tcp comment 'SSH alternate port'
sudo ufw deny 22/tcp  # Deny old port
sudo ufw reload
```

Update fail2ban to watch the new port:

```ini
[sshd]
enabled = true
port = 2222
```

## Combining Controls Effectively

The most effective defense uses all layers together:

1. **SSH MaxAuthTries** - limits attempts per connection to 3
2. **pam_faillock** - locks the account after 5 failures from any source
3. **fail2ban** - bans the IP after 3 failures so new connections are impossible
4. **iptables rate limiting** - drops excessive SYN packets before they reach SSH
5. **Non-standard port** - eliminates most automated scanning traffic

Any single layer can be bypassed or has edge cases. Together, they create a defense that requires an attacker to coordinate a more sophisticated attack.

The auth log at `/var/log/auth.log` is the authoritative source for login events. Regular review - even just a weekly `grep Failed /var/log/auth.log | wc -l` - shows whether your controls are working or whether something unusual is happening.
