# How to Monitor Auth Logs for Security Events on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Logging, Authentication, System Administration

Description: Monitor and analyze authentication logs on Ubuntu to detect brute force attacks, unauthorized access attempts, privilege escalation, and suspicious login patterns.

---

Authentication logs record every login attempt, sudo command, SSH session, and PAM authentication event on your system. Regularly monitoring these logs is one of the most practical security measures you can take on a production server. Ubuntu stores authentication events in `/var/log/auth.log`, which is the primary source for the analysis covered here.

## Understanding Auth Log Format

Authentication log entries follow syslog format:

```text
Mar  2 14:23:01 hostname sshd[12345]: Failed password for root from 192.168.1.50 port 45231 ssh2
Mar  2 14:23:05 hostname sshd[12346]: Accepted publickey for admin from 10.0.0.5 port 52341 ssh2
Mar  2 14:24:01 hostname sudo: admin : TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/usr/bin/apt update
```

Each entry includes:
- Timestamp (month day time)
- Hostname
- Process and PID
- Log message

## Basic Auth Log Monitoring Commands

```bash
# View real-time authentication events
sudo tail -f /var/log/auth.log

# View recent auth events
sudo tail -n 100 /var/log/auth.log

# Count failed login attempts today
grep "Failed password" /var/log/auth.log | wc -l

# Show failed logins with timestamps
grep "Failed password" /var/log/auth.log | tail -20

# Show successful logins
grep "Accepted " /var/log/auth.log | tail -20

# Show all sudo commands
grep "sudo:" /var/log/auth.log | grep "COMMAND" | tail -20
```

## Detecting SSH Brute Force Attacks

```bash
# Count failed SSH attempts by source IP
grep "Failed password" /var/log/auth.log | \
    awk '{print $11}' | \
    sort | uniq -c | sort -rn | head -20

# Show which usernames are being targeted
grep "Failed password" /var/log/auth.log | \
    awk '{print $9}' | \
    sort | uniq -c | sort -rn | head -20

# Show attempts for invalid usernames specifically
grep "Invalid user" /var/log/auth.log | \
    awk '{print $8, $10}' | \
    sort | uniq -c | sort -rn | head -20

# Find IPs with more than 10 failed attempts (potential brute force)
grep "Failed password" /var/log/auth.log | \
    awk '{print $11}' | \
    sort | uniq -c | \
    awk '$1 > 10 {print $0}' | \
    sort -rn

# Time-based analysis: failed attempts per hour
grep "Failed password" /var/log/auth.log | \
    awk '{print $3}' | \
    cut -d: -f1 | \
    sort | uniq -c
```

## Monitoring SSH Successful Logins

```bash
# List all successful SSH logins
grep "Accepted " /var/log/auth.log | \
    awk '{print $1, $2, $3, "user:", $9, "from:", $11, "method:", $7}'

# Successful logins by authentication method
grep "Accepted " /var/log/auth.log | \
    awk '{print $7}' | \
    sort | uniq -c

# Find logins using password (potentially weaker security)
grep "Accepted password" /var/log/auth.log

# Find logins from unusual source IPs
# First establish your known IPs, then look for others
grep "Accepted " /var/log/auth.log | \
    awk '{print $11}' | \
    sort | uniq | \
    grep -v "^10\.\|^192\.168\.\|^172\.\|^127\."
```

## Monitoring sudo Usage

sudo logs every command executed with elevated privileges:

```bash
# Show all sudo commands
grep "sudo:" /var/log/auth.log | grep "COMMAND"

# Show sudo commands from a specific user
grep "sudo:" /var/log/auth.log | grep "COMMAND" | grep "username"

# Show failed sudo attempts (wrong password or not in sudoers)
grep "sudo:" /var/log/auth.log | grep -i "fail\|denied"

# Show who has used sudo in the last 24 hours
grep "sudo:" /var/log/auth.log | grep "COMMAND" | \
    awk '{print $6, $14}' | \
    sed 's/USER=//; s/COMMAND=//' | \
    sort | uniq -c

# Alert on sensitive commands
grep "sudo:" /var/log/auth.log | grep "COMMAND" | \
    grep -E "passwd|shadow|sudoers|visudo|usermod|useradd|userdel"
```

## Setting Up Real-Time Alerting

Monitor the auth log in real-time and send alerts:

```bash
sudo nano /usr/local/bin/auth-monitor
```

```bash
#!/bin/bash
# Real-time auth.log monitor with alerting
# Run: sudo /usr/local/bin/auth-monitor

ALERT_EMAIL="admin@example.com"
THRESHOLD=10  # Alert after this many failed attempts from single IP
LOG_FILE="/var/log/auth.log"

# Track failed attempts per IP
declare -A fail_counts

tail -f "$LOG_FILE" | while read line; do
    # Check for SSH brute force
    if echo "$line" | grep -q "Failed password"; then
        ip=$(echo "$line" | awk '{print $11}')
        fail_counts[$ip]=$((${fail_counts[$ip]:-0} + 1))

        if [ "${fail_counts[$ip]}" -eq "$THRESHOLD" ]; then
            echo "ALERT: $ip has $THRESHOLD failed SSH attempts" | \
                mail -s "SSH Brute Force Alert from $ip" "$ALERT_EMAIL"
            logger -t auth-monitor "Alert sent for $ip: $THRESHOLD failed attempts"
        fi
    fi

    # Alert on root login
    if echo "$line" | grep -q "Accepted.*for root"; then
        echo "ALERT: Root login detected: $line" | \
            mail -s "Root SSH Login Alert" "$ALERT_EMAIL"
        logger -t auth-monitor "Root login alert: $line"
    fi

    # Alert on sudo for sensitive commands
    if echo "$line" | grep -q "sudo:" && \
       echo "$line" | grep -q "COMMAND" && \
       echo "$line" | grep -qE "visudo|/etc/shadow|usermod|useradd"; then
        echo "ALERT: Sensitive sudo command: $line" | \
            mail -s "Sensitive Command Alert" "$ALERT_EMAIL"
    fi
done
```

```bash
sudo chmod +x /usr/local/bin/auth-monitor

# Run as a service
sudo nano /etc/systemd/system/auth-monitor.service
```

```bash
[Unit]
Description=Authentication Log Monitor
After=network.target

[Service]
ExecStart=/usr/local/bin/auth-monitor
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable auth-monitor
sudo systemctl start auth-monitor
```

## Using fail2ban for Automated Response

fail2ban reads auth.log and automatically bans IPs that exceed thresholds:

```bash
# Install fail2ban
sudo apt install fail2ban

# Create a custom jail configuration
sudo nano /etc/fail2ban/jail.local
```

```bash
[DEFAULT]
# Ban for 1 hour
bantime = 3600

# Detection window (look for failures in last 10 minutes)
findtime = 600

# Max failures before ban
maxretry = 5

# Email alerts
destemail = admin@example.com
sendername = Fail2ban
mta = sendmail
action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 86400   # Ban for 24 hours

[sshd-ddos]
enabled = true
port = ssh
filter = sshd-ddos
logpath = /var/log/auth.log
maxretry = 10
findtime = 60
bantime = 3600
```

```bash
# Start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check banned IPs
sudo fail2ban-client status
sudo fail2ban-client status sshd

# View the ban log
sudo fail2ban-client get sshd banip
```

## Generating Auth Log Reports

Create a daily report of authentication events:

```bash
sudo nano /usr/local/bin/auth-report
```

```bash
#!/bin/bash
# Daily authentication report

DATE=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)
AUTH_LOG="/var/log/auth.log"

echo "===== Authentication Report for $DATE ====="
echo ""

echo "--- Failed SSH Login Attempts ---"
FAILED=$(grep "Failed password" $AUTH_LOG | grep "$(date -d yesterday '+%b %e' 2>/dev/null || date -v-1d '+%b %e')" | wc -l)
echo "Total failed attempts: $FAILED"
echo ""
echo "Top attacking IPs:"
grep "Failed password" $AUTH_LOG | \
    grep "$(date -d yesterday '+%b %e' 2>/dev/null || date -v-1d '+%b %e')" | \
    awk '{print $11}' | sort | uniq -c | sort -rn | head -10
echo ""

echo "--- Successful Logins ---"
grep "Accepted " $AUTH_LOG | \
    grep "$(date -d yesterday '+%b %e' 2>/dev/null || date -v-1d '+%b %e')" | \
    awk '{print $1, $2, $3, $9, "from", $11}'
echo ""

echo "--- sudo Commands ---"
grep "sudo.*COMMAND" $AUTH_LOG | \
    grep "$(date -d yesterday '+%b %e' 2>/dev/null || date -v-1d '+%b %e')" | \
    awk -F';' '{print $2, $4}' | \
    sed 's/USER=//; s/COMMAND=//' | \
    sort | uniq -c | sort -rn
echo ""

echo "--- Account Changes ---"
grep -E "useradd|userdel|usermod|passwd|chpasswd" $AUTH_LOG | \
    grep "$(date -d yesterday '+%b %e' 2>/dev/null || date -v-1d '+%b %e')"
echo ""
```

```bash
sudo chmod +x /usr/local/bin/auth-report

# Schedule daily
sudo crontab -e
```

```bash
# Run daily at 8 AM, email report
0 8 * * * /usr/local/bin/auth-report | mail -s "Daily Auth Report $(date +%Y-%m-%d)" admin@example.com
```

## Using journalctl for Auth Log Analysis

On systems using systemd, auth events are also in the journal:

```bash
# SSH events from current boot
journalctl -u sshd -b

# Failed SSH attempts in the last hour
journalctl -u sshd --since "1 hour ago" | grep "Failed"

# Authentication events from PAM
journalctl -b | grep "pam_unix"

# Sudo events
journalctl -u sudo -b
journalctl -b | grep "sudo"

# Failed attempts in the last 24 hours
journalctl --since "24 hours ago" | grep -i "failed\|denied\|invalid" | wc -l
```

## Configuring Centralized Auth Log Monitoring

Forward auth logs to a central server for aggregated security monitoring:

```bash
# In /etc/rsyslog.d/10-forward-auth.conf
# Forward auth logs to central security server
auth,authpriv.* @@security-siem.example.com:514

# Or forward all logs but tag for easy filtering
:programname, isequal, "sshd" @@security-siem.example.com:514
:programname, isequal, "sudo" @@security-siem.example.com:514
```

Consistent monitoring of authentication logs is one of the most effective security practices available. Even on small deployments, reviewing these logs weekly - or setting up automated alerting - will catch the majority of unauthorized access attempts and help you understand your attack surface.
