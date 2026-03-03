# How to Configure fail2ban with UFW on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, fail2ban, UFW, Security, Brute Force Protection

Description: Configure fail2ban to work with UFW on Ubuntu to automatically ban IP addresses showing malicious behavior, with custom jails for SSH, Nginx, and other services.

---

UFW's built-in rate limiting blocks IPs after 6 connections in 30 seconds, but it doesn't persist blocks, can't inspect application logs, and only works for SSH. fail2ban fills these gaps by reading service logs, detecting attack patterns, and issuing longer-duration bans through UFW.

The combination of UFW for firewall management and fail2ban for behavioral blocking is a common and effective approach on Ubuntu servers.

## How fail2ban Works

fail2ban has three main components:

1. **Filters**: Regular expressions that detect attack patterns in log files
2. **Jails**: Configuration that combines a filter with log files, thresholds, and ban duration
3. **Actions**: What happens when a ban triggers (UFW block, iptables block, email, etc.)

When fail2ban detects that an IP has matched a filter pattern more than `maxretry` times within `findtime` seconds, it executes the configured action, typically blocking the IP via the system firewall.

## Installing fail2ban

```bash
sudo apt update
sudo apt install -y fail2ban

# Check the service status
sudo systemctl status fail2ban

# It should start automatically
sudo systemctl enable fail2ban
```

## Configuration File Structure

fail2ban uses a layered configuration approach:

- `/etc/fail2ban/fail2ban.conf` - Main configuration (don't edit this)
- `/etc/fail2ban/jail.conf` - Default jail settings (don't edit this)
- `/etc/fail2ban/fail2ban.local` - Your overrides for main config
- `/etc/fail2ban/jail.local` - Your jail configurations

The `.local` files override the `.conf` files. This approach means package updates won't overwrite your customizations.

## Configuring the UFW Action

fail2ban comes with a UFW action. Check that it exists:

```bash
cat /etc/fail2ban/action.d/ufw.conf
```

If it exists, it typically contains:

```text
[Definition]
actionstart =
actionstop =
actioncheck =
actionban = ufw insert 1 deny from <ip> to any
actionunban = ufw delete deny from <ip> to any
```

## Creating jail.local

Create your main jail configuration:

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
# Ban IPs for 1 hour (3600 seconds)
bantime = 3600

# Window in which to count failures (10 minutes)
findtime = 600

# Number of failures before banning
maxretry = 5

# Use UFW as the action
banaction = ufw

# Email notifications (optional)
# destemail = admin@example.com
# sendername = fail2ban
# mta = sendmail
# action = %(action_mwl)s  # Ban + email with log lines

# Ignore these IPs (never ban)
ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24

# Backend for log detection
backend = auto

# Enable logging
logtarget = /var/log/fail2ban.log
loglevel = INFO

# SSH jail
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 300

# More aggressive for SSH
# Ban for 24 hours after 3 failures in 5 minutes
```

## SSH Jail Configuration

The SSH jail is the most important one to configure:

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[sshd]
enabled = true

# Port to ban (use the actual port if SSH is not on 22)
port = ssh,22

# Filter to use
filter = sshd

# Log file to monitor
logpath = /var/log/auth.log

# Ban after 3 failures
maxretry = 3

# Within 5 minutes
findtime = 300

# Ban for 24 hours
bantime = 86400

# Use UFW for banning
banaction = ufw
```

## Testing the Filter

Before enabling a jail, verify the filter matches your actual log entries:

```bash
# Test the SSH filter against the log file
sudo fail2ban-regex /var/log/auth.log /etc/fail2ban/filter.d/sshd.conf

# View what the filter looks like
cat /etc/fail2ban/filter.d/sshd.conf
```

The output shows how many lines matched, which confirms the filter is working correctly with your log format.

## Adding Nginx Jails

For web servers, protect against brute force and scanner activity:

```bash
sudo nano /etc/fail2ban/jail.local
```

Add the following sections:

```ini
# Nginx HTTP authentication failures
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600
banaction = ufw

# Nginx 404 scanner/bad bot detection
[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 10
findtime = 60
bantime = 3600
banaction = ufw

# Nginx limit req (rate limiting - ban clients exceeding rate limits)
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 3600
banaction = ufw
```

Check that the filters exist:

```bash
ls /etc/fail2ban/filter.d/ | grep nginx
```

## Creating Custom Filters

For services without built-in fail2ban filters:

```bash
sudo nano /etc/fail2ban/filter.d/myapp.conf
```

```ini
[Definition]
# Match failed login attempts in the application log
# Adjust the regex to match your actual log format

failregex = .*Authentication failed.*from <HOST>.*
            .*Invalid password for.*from <HOST>.*
            .*Login failed.*ip=<HOST>.*

ignoreregex =
```

Test the filter:

```bash
sudo fail2ban-regex /var/log/myapp/app.log /etc/fail2ban/filter.d/myapp.conf
```

Create the jail:

```ini
[myapp]
enabled = true
filter = myapp
logpath = /var/log/myapp/app.log
maxretry = 5
findtime = 300
bantime = 3600
banaction = ufw
```

## Applying Configuration

After making changes:

```bash
# Restart fail2ban to apply changes
sudo systemctl restart fail2ban

# Check the status of all jails
sudo fail2ban-client status

# Check a specific jail
sudo fail2ban-client status sshd
```

Output from `fail2ban-client status sshd`:

```text
Status for the jail: sshd
|- Filter
|  |- Currently failed: 2
|  |- Total failed: 147
|  `- File list: /var/log/auth.log
`- Actions
   |- Currently banned: 3
   |- Total banned: 27
   `- Banned IP list: 203.0.113.100 198.51.100.50 192.0.2.10
```

## Manually Banning and Unbanning IPs

```bash
# Manually ban an IP in a jail
sudo fail2ban-client set sshd banip 203.0.113.100

# Unban an IP from a jail
sudo fail2ban-client set sshd unbanip 203.0.113.100

# Unban from all jails
sudo fail2ban-client set all unbanip 203.0.113.100

# Check if an IP is banned
sudo fail2ban-client get sshd banned | grep 203.0.113.100

# Check UFW to confirm the ban is in place
sudo ufw status | grep 203.0.113.100
```

## Verifying Bans Are Working Through UFW

When fail2ban bans an IP, it inserts a UFW rule:

```bash
# After a ban, check UFW rules
sudo ufw status numbered | head -5
```

You should see entries like:

```text
[ 1] Anywhere                   DENY IN     203.0.113.100
[ 2] Anywhere                   DENY IN     198.51.100.50
```

These are inserted at position 1 (highest priority) so they take effect before other rules.

## Setting Up Email Notifications

To receive emails when bans are triggered:

```bash
sudo apt install -y mailutils

sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
destemail = admin@example.com
sendername = fail2ban on server1
mta = sendmail
# action_mwl = ban + email with whois + log lines
action = %(action_mwl)s
```

## Persistent Bans

By default, fail2ban bans are removed when the service restarts. For persistent bans that survive restarts:

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
# Store ban database in a file that persists across restarts
dbfile = /var/lib/fail2ban/fail2ban.sqlite3
dbpurgeage = 86400  # Remove entries older than 1 day from the database
```

The database stores IP ban history, so on restart, fail2ban knows which IPs were previously banned (though whether they get re-banned depends on whether their `bantime` has expired).

## Viewing fail2ban Logs

```bash
# Real-time log view
sudo tail -f /var/log/fail2ban.log

# Filter for bans
sudo grep "Ban\|Unban" /var/log/fail2ban.log | tail -30

# Find the most banned IPs overall
sudo grep "Ban" /var/log/fail2ban.log \
    | awk '{print $NF}' \
    | sort | uniq -c | sort -rn \
    | head -20
```

## Handling False Positives

If a legitimate user gets banned:

```bash
# Unban the IP immediately
sudo fail2ban-client set sshd unbanip THEIR_IP

# Add the IP to the ignoreip list to prevent future bans
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24 THEIR_IP
```

```bash
sudo systemctl reload fail2ban
```

## Performance Tuning

For busy servers with many log lines:

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
# Reduce polling frequency for log backends
backend = systemd  # Use systemd journal for lower overhead than polling files

# Or use polling with a longer interval
backend = polling
```

Using the `systemd` backend reads from the journal rather than polling log files, which is more efficient on Ubuntu systems using systemd.

The combination of UFW and fail2ban provides solid automated protection against brute force attacks. UFW handles the firewall mechanics, while fail2ban brings the intelligence layer of reading logs, detecting attack patterns, and making dynamic ban decisions. Together they handle the vast majority of automated attack traffic without requiring manual intervention.
