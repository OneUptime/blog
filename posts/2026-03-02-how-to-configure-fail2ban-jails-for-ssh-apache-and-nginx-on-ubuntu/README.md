# How to Configure fail2ban Jails for SSH, Apache, and Nginx on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Fail2Ban, Security, SSH, NGINX

Description: Detailed guide to configuring fail2ban jails on Ubuntu to block brute force attacks on SSH, Apache, and Nginx, including custom filters, ban actions, and monitoring failed attempts.

---

Fail2ban scans log files for patterns indicating brute force or abusive behavior, then bans the offending IP addresses using firewall rules. Out of the box, it ships with filters for dozens of services. The configuration model is straightforward: jails define what to monitor, filters define what to look for, and actions define what to do when a threshold is crossed.

## Installation

```bash
sudo apt-get update
sudo apt-get install -y fail2ban

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Configuration Structure

```text
/etc/fail2ban/
├── fail2ban.conf        # Global daemon settings (don't edit)
├── fail2ban.local       # Your overrides to fail2ban.conf
├── jail.conf            # Default jail configs (don't edit)
├── jail.local           # Your jail overrides (edit this)
├── filter.d/            # Filter definitions
│   ├── sshd.conf
│   ├── apache-auth.conf
│   └── nginx-http-auth.conf
└── action.d/            # Ban action definitions
    ├── iptables-multiport.conf
    └── sendmail.conf
```

The rule: never edit `.conf` files directly. Always create `.local` counterparts.

## Setting Up jail.local

Create or edit `/etc/fail2ban/jail.local`:

```bash
sudo tee /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# IP addresses to never ban (space-separated list)
# Add your management IPs here
ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24

# How long to ban (seconds). 3600 = 1 hour
bantime = 3600

# Time window to look for failures (seconds). 600 = 10 minutes
findtime = 600

# Number of failures before ban
maxretry = 5

# Use systemd for log backends where supported
backend = systemd

# Email alerts (configure if you have working SMTP)
# destemail = admin@example.com
# sender = fail2ban@your-server.com
# mta = sendmail
# action = %(action_mwl)s  # ban + email with log excerpt

# Default action: ban only (no email)
action = %(action_)s
EOF
```

## SSH Jail Configuration

```bash
sudo tee -a /etc/fail2ban/jail.local << 'EOF'

[sshd]
enabled = true
port = ssh
filter = sshd
# Path to SSH auth log
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400   # 24-hour ban for SSH brute force
findtime = 300    # within 5 minutes

# For servers with many legitimate users, be less aggressive
# maxretry = 10
# bantime = 3600
EOF
```

If SSH runs on a non-standard port:

```bash
# In jail.local under [sshd]:
port = 2222  # your custom SSH port
```

Verify the SSH filter works with your log format:

```bash
# Test filter against your log file
sudo fail2ban-regex /var/log/auth.log /etc/fail2ban/filter.d/sshd.conf

# Look for "Lines: X matched" in the output
```

## Apache Jails

### Apache Authentication Failures

```bash
sudo tee -a /etc/fail2ban/jail.local << 'EOF'

[apache-auth]
enabled = true
port = http,https
filter = apache-auth
logpath = /var/log/apache2/error.log
maxretry = 5
bantime = 3600

[apache-badbots]
enabled = true
port = http,https
filter = apache-badbots
logpath = /var/log/apache2/access.log
maxretry = 2
bantime = 86400

[apache-noscript]
enabled = true
port = http,https
filter = apache-noscript
logpath = /var/log/apache2/access.log
maxretry = 6
bantime = 3600

[apache-overflows]
enabled = true
port = http,https
filter = apache-overflows
logpath = /var/log/apache2/error.log
maxretry = 2
bantime = 86400
EOF
```

### Custom Apache Filter for Login Pages

If you have a custom login page that logs failures:

```bash
sudo tee /etc/fail2ban/filter.d/apache-login.conf << 'EOF'
[Definition]
failregex = ^<HOST> -.*"POST /login.* HTTP/[0-9\.]+" 401 .*$
            ^<HOST> -.*"POST /wp-login.php.* HTTP/[0-9\.]+" 200 .*$

ignoreregex =
EOF
```

```bash
# Add the jail
sudo tee -a /etc/fail2ban/jail.local << 'EOF'

[apache-login]
enabled = true
port = http,https
filter = apache-login
logpath = /var/log/apache2/access.log
maxretry = 5
bantime = 3600
EOF
```

## Nginx Jails

### Nginx HTTP Authentication

```bash
sudo tee -a /etc/fail2ban/jail.local << 'EOF'

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600

[nginx-botsearch]
enabled = true
port = http,https
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400

[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 7200
EOF
```

### Custom Nginx Filter for 4xx Errors

A filter that bans IPs generating too many 404s (scanner behavior):

```bash
sudo tee /etc/fail2ban/filter.d/nginx-4xx.conf << 'EOF'
[Definition]
# Matches any 4xx status code except 400 (common for legit browsers)
failregex = ^<HOST> - .+ "(GET|POST|HEAD) .+ HTTP/[0-9\.]+" (401|403|404|429) .+$

ignoreregex = ^<HOST> - .+ "(GET|POST|HEAD) .+ HTTP/[0-9\.]+" 400 .+$
EOF
```

```bash
sudo tee -a /etc/fail2ban/jail.local << 'EOF'

[nginx-4xx]
enabled = true
port = http,https
filter = nginx-4xx
logpath = /var/log/nginx/access.log
maxretry = 20
findtime = 300
bantime = 7200
EOF
```

## Actions: Beyond Simple IP Banning

### Email Notifications

To receive emails when IPs are banned:

```bash
sudo apt-get install -y mailutils

# In jail.local [DEFAULT]:
destemail = admin@example.com
sender = fail2ban@your-server.com
mta = mail
# action_mwl = ban + whois lookup + log excerpt
action = %(action_mwl)s
```

### Persistent Bans with Database

```bash
# In /etc/fail2ban/fail2ban.local:
sudo tee /etc/fail2ban/fail2ban.local << 'EOF'
[Definition]
# Store banned IPs in database
dbfile = /var/lib/fail2ban/fail2ban.sqlite3

# Keep ban records for 30 days (even across restarts)
dbpurgeage = 2592000
EOF
```

### Custom Ban Action with Webhook

Send a Slack notification when IPs are banned:

```bash
sudo tee /etc/fail2ban/action.d/slack-notify.conf << 'EOF'
[Definition]
actionstart =
actionstop =
actioncheck =

actionban = curl -s -X POST -H 'Content-type: application/json' \
    --data '{"text":"fail2ban: banned <ip> from jail <name> on '"$(hostname)"'"}' \
    YOUR_SLACK_WEBHOOK_URL

actionunban =

[Init]
name = default
EOF
```

```bash
# Use in a jail:
# action = %(action_)s
#          slack-notify
```

## Managing fail2ban

### Check Status

```bash
# Overall status
sudo fail2ban-client status

# Status of a specific jail
sudo fail2ban-client status sshd
sudo fail2ban-client status nginx-http-auth

# List all banned IPs
sudo fail2ban-client status sshd | grep "Banned IP"
```

### Manual Ban and Unban

```bash
# Manually ban an IP in a specific jail
sudo fail2ban-client set sshd banip 10.0.0.50

# Unban an IP from a specific jail
sudo fail2ban-client set sshd unbanip 10.0.0.50

# Unban from all jails
for jail in $(sudo fail2ban-client status | grep "Jail list" | sed 's/.*:\s*//' | tr ',' ' '); do
    sudo fail2ban-client set "$jail" unbanip 10.0.0.50
done
```

### View Logs

```bash
# Watch fail2ban activity in real-time
sudo journalctl -u fail2ban -f

# Or the log file
sudo tail -f /var/log/fail2ban.log

# Filter for ban events
sudo grep "Ban\|Unban" /var/log/fail2ban.log | tail -50
```

### Testing Filters

Always test filters before deploying jails:

```bash
# Test SSH filter
sudo fail2ban-regex /var/log/auth.log /etc/fail2ban/filter.d/sshd.conf --print-all-matched

# Test a custom filter against a log file
sudo fail2ban-regex /var/log/nginx/access.log /etc/fail2ban/filter.d/nginx-4xx.conf

# Test with systemd journal
sudo fail2ban-regex systemd-journal /etc/fail2ban/filter.d/sshd.conf
```

## Applying Configuration Changes

```bash
# Reload fail2ban after configuration changes
sudo systemctl reload fail2ban

# Or
sudo fail2ban-client reload

# Reload a specific jail without restarting everything
sudo fail2ban-client reload sshd

# Restart if reload doesn't work
sudo systemctl restart fail2ban
```

## Monitoring Statistics

```bash
# Generate a report of ban activity
sudo fail2ban-client status | grep "Jail list" | sed 's/.*:\s*//' | tr ',' '\n' | \
while read jail; do
    echo "=== $jail ==="
    sudo fail2ban-client status "$jail" | grep -E "Currently|Total"
done

# Check the SQLite database directly
sudo sqlite3 /var/lib/fail2ban/fail2ban.sqlite3 \
    "SELECT jail, ip, banned, bantime FROM bans ORDER BY bantime DESC LIMIT 20;"
```

## Recidive Jail: Permanent Bans for Repeat Offenders

The recidive jail bans IPs that get banned multiple times across any jail:

```bash
sudo tee -a /etc/fail2ban/jail.local << 'EOF'

[recidive]
enabled = true
filter = recidive
logpath = /var/log/fail2ban.log
action = %(action_)s
bantime = 604800   # 1 week
findtime = 86400   # within 24 hours
maxretry = 3       # banned 3 times in 24 hours = 1 week ban
EOF
```

This layered approach - short bans for first offenses, long bans for repeat offenders - keeps legitimate users unaffected while making brute force impractical.
