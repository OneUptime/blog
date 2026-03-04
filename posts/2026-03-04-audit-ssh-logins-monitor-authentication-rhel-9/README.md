# How to Audit SSH Logins and Monitor Authentication Attempts on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSH, auditd, Authentication, Security Monitoring, Linux

Description: Set up SSH login auditing and authentication monitoring on RHEL using auditd, journalctl, and log analysis to detect brute force attacks and unauthorized access.

---

SSH is the most common way to remotely access RHEL systems, which makes it a prime target for attackers. Monitoring SSH logins and authentication attempts lets you detect brute force attacks, identify unauthorized access, and maintain a compliance-ready audit trail. This guide covers multiple approaches to SSH authentication monitoring.

## Sources of SSH Authentication Data

```mermaid
flowchart TD
    A[SSH Authentication Events] --> B[auditd]
    A --> C[systemd journal]
    A --> D[/var/log/secure]
    A --> E[/var/log/lastlog]
    A --> F[/var/log/wtmp and btmp]

    B --> G[Detailed syscall-level audit]
    C --> H[sshd service logs]
    D --> I[PAM authentication logs]
    E --> J[Last login records]
    F --> K[Login/logout and failed login records]
```

## Setting Up auditd Rules for SSH Monitoring

### Authentication Event Rules

```bash
sudo tee /etc/audit/rules.d/50-ssh-auth.rules << 'EOF'
## SSH authentication and login monitoring

# Monitor SSH configuration for changes
-w /etc/ssh/sshd_config -p wa -k sshd_config
-w /etc/ssh/sshd_config.d/ -p wa -k sshd_config

# Monitor authorized_keys files
-w /root/.ssh/ -p wa -k ssh_keys
-w /etc/ssh/authorized_keys/ -p wa -k ssh_keys

# Monitor PAM configuration for SSH
-w /etc/pam.d/sshd -p wa -k ssh_pam
-w /etc/pam.d/password-auth -p wa -k ssh_pam
-w /etc/pam.d/system-auth -p wa -k ssh_pam

# Monitor login-related files
-w /var/log/lastlog -p wa -k logins
-w /var/log/wtmp -p wa -k session
-w /var/log/btmp -p wa -k failed_logins
-w /var/run/utmp -p wa -k session

# Monitor faillock directory for account lockouts
-w /var/run/faillock/ -p wa -k account_lockout
EOF

# Load the rules
sudo augenrules --load
```

## Monitoring with auditd

### Search for Login Events

```bash
# View all login events today
sudo ausearch -m USER_LOGIN -ts today -i

# View failed login events
sudo ausearch -m USER_LOGIN -sv no -ts today -i

# View authentication events (password checks)
sudo ausearch -m USER_AUTH -ts today -i

# View failed authentication events
sudo ausearch -m USER_AUTH -sv no -ts today -i

# View user session start/end events
sudo ausearch -m USER_START -m USER_END -ts today -i
```

### Generate Authentication Reports

```bash
# Login report
sudo aureport --login -ts today -i

# Failed login report
sudo aureport --login --failed -ts today -i

# Authentication report
sudo aureport --auth -ts today -i

# Failed authentication report
sudo aureport --auth --failed -ts today -i
```

## Monitoring with journalctl

The systemd journal contains detailed sshd log messages:

```bash
# View all SSH-related journal entries
sudo journalctl -u sshd --since today

# View only failed authentication attempts
sudo journalctl -u sshd --since today | grep -i "failed\|invalid\|error"

# View successful logins
sudo journalctl -u sshd --since today | grep "Accepted"

# View disconnections
sudo journalctl -u sshd --since today | grep "Disconnected\|Received disconnect"

# Follow SSH logs in real time
sudo journalctl -u sshd -f
```

## Monitoring with Traditional Log Files

### /var/log/secure

```bash
# View recent SSH authentication attempts
sudo tail -100 /var/log/secure | grep sshd

# Count failed login attempts by IP address
sudo grep "Failed password" /var/log/secure | \
    awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head -20

# Count successful logins by user
sudo grep "Accepted" /var/log/secure | \
    awk '{print $9}' | sort | uniq -c | sort -rn

# Find brute force attempts (more than 10 failures from one IP)
sudo grep "Failed password" /var/log/secure | \
    awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | \
    awk '$1 > 10 {print}'
```

### Using last and lastb

```bash
# View recent successful logins
last -20

# View recent failed login attempts
sudo lastb -20

# View logins for a specific user
last username

# View logins from a specific IP
last -i | grep "192.168.1.100"

# View currently logged-in users
who
w
```

## Building an SSH Login Monitoring Script

```bash
#!/bin/bash
# /usr/local/bin/ssh-login-monitor.sh
# Comprehensive SSH login monitoring report

echo "============================================"
echo "SSH Login Monitoring Report"
echo "Date: $(date)"
echo "Host: $(hostname)"
echo "============================================"

echo ""
echo "--- Currently Logged In Users ---"
who

echo ""
echo "--- Last 10 Successful Logins ---"
last -10

echo ""
echo "--- Last 10 Failed Login Attempts ---"
sudo lastb -10 2>/dev/null

echo ""
echo "--- Failed Login Count by IP (Today) ---"
sudo journalctl -u sshd --since today --no-pager 2>/dev/null | \
    grep "Failed password" | \
    grep -oP 'from \K[\d.]+' | sort | uniq -c | sort -rn | head -10

echo ""
echo "--- Failed Login Count by Username (Today) ---"
sudo journalctl -u sshd --since today --no-pager 2>/dev/null | \
    grep "Failed password" | \
    grep -oP 'for (invalid user )?\K\S+' | sort | uniq -c | sort -rn | head -10

echo ""
echo "--- Successful Logins Today ---"
sudo journalctl -u sshd --since today --no-pager 2>/dev/null | \
    grep "Accepted" | \
    awk '{print $1, $2, $3, "User:", $9, "From:", $11, "Method:", $7}'

echo ""
echo "--- Audit Login Events (Today) ---"
sudo aureport --login -ts today -i 2>/dev/null | tail -20
```

## Detecting Brute Force Attacks

Create a script that detects and alerts on brute force SSH attempts:

```bash
#!/bin/bash
# /usr/local/bin/ssh-brute-detect.sh
# Detect SSH brute force attempts

THRESHOLD=10  # Number of failures to trigger an alert
TIMEFRAME="10 minutes ago"
ALERT_EMAIL="security@example.com"
HOSTNAME=$(hostname)

# Count failures per IP in the timeframe
ATTACKERS=$(sudo journalctl -u sshd --since "$TIMEFRAME" --no-pager 2>/dev/null | \
    grep "Failed password" | \
    grep -oP 'from \K[\d.]+' | sort | uniq -c | sort -rn | \
    awk -v threshold="$THRESHOLD" '$1 >= threshold {print $1, $2}')

if [ -n "$ATTACKERS" ]; then
    MESSAGE="SSH brute force attack detected on $HOSTNAME:\n\n"
    MESSAGE+="Failures | Source IP\n"
    MESSAGE+="$ATTACKERS\n"

    echo -e "$MESSAGE" | systemd-cat -t ssh-brute-detect -p crit
    echo -e "$MESSAGE" | mail -s "SSH Brute Force Alert on $HOSTNAME" "$ALERT_EMAIL" 2>/dev/null
fi
```

Schedule it to run frequently:

```bash
# Run every 5 minutes
echo "*/5 * * * * root /usr/local/bin/ssh-brute-detect.sh" | \
    sudo tee /etc/cron.d/ssh-brute-detect
```

## Configuring sshd for Better Logging

Enhance SSH logging by adjusting the sshd configuration:

```bash
# Edit SSH server configuration
sudo vi /etc/ssh/sshd_config
```

Recommended logging settings:

```bash
# Set log level to VERBOSE for detailed authentication logging
LogLevel VERBOSE

# Log to AUTH facility
SyslogFacility AUTH

# Show last login information
PrintLastLog yes
```

Restart sshd:

```bash
sudo systemctl restart sshd
```

With `LogLevel VERBOSE`, sshd will log the key fingerprint used for each public key authentication, making it possible to identify which specific key was used.

## Summary

Monitoring SSH logins and authentication on RHEL involves multiple data sources: auditd for system-level auditing, the systemd journal for sshd service logs, and traditional log files for quick analysis. Set up audit rules to track authentication events, create scripts to detect brute force attacks, and generate regular reports to review login activity. Combining these approaches gives you comprehensive visibility into who is accessing your system.
