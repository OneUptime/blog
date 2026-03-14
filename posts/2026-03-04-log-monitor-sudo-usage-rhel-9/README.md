# How to Log and Monitor Sudo Usage on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Sudo, Logging, Monitoring, Linux

Description: Set up comprehensive sudo logging and monitoring on RHEL using syslog, sudo I/O logging, and auditd to track privileged command execution.

---

Every sudo command is a privileged action. If you are not logging and monitoring these, you are flying blind when it comes to insider threats, compromised accounts, and compliance audits. RHEL gives you several ways to track sudo usage, from basic syslog entries to full session recordings.

## Default Sudo Logging

Out of the box, sudo logs every command to syslog. These entries go to `/var/log/secure` on RHEL:

```bash
# View recent sudo entries
sudo grep "sudo:" /var/log/secure | tail -20
```

A typical entry looks like:

```bash
Mar  4 14:22:01 server01 sudo: jsmith : TTY=pts/0 ; PWD=/home/jsmith ; USER=root ; COMMAND=/usr/bin/systemctl restart httpd
```

This tells you who ran the command, which terminal, their working directory, the target user, and the full command.

## Configuring a Dedicated Sudo Log File

Separate sudo logs from the rest of `/var/log/secure` for easier analysis:

```bash
sudo visudo -f /etc/sudoers.d/00-logging
```

```bash
# Send sudo logs to a dedicated file
Defaults logfile="/var/log/sudo.log"
Defaults log_year
Defaults log_host
```

Create the log file and set permissions:

```bash
sudo touch /var/log/sudo.log
sudo chmod 600 /var/log/sudo.log
```

### Set up log rotation

```bash
sudo vi /etc/logrotate.d/sudo
```

```bash
/var/log/sudo.log {
    weekly
    rotate 52
    compress
    delaycompress
    missingok
    notifempty
    create 0600 root root
}
```

## Enabling sudo I/O Logging

I/O logging records everything that happens during a sudo session, including all input, output, and timing data. This is the gold standard for auditing.

```bash
sudo visudo -f /etc/sudoers.d/00-iolog
```

```bash
# Enable I/O logging for all sudo sessions
Defaults log_output
Defaults log_input

# Exclude sudoreplay from I/O logging to avoid recursion
Defaults!/usr/bin/sudoreplay !log_output
Defaults!/usr/bin/sudoreplay !log_input

# Set the I/O log directory
Defaults iolog_dir=/var/log/sudo-io/%{user}
```

### Create the I/O log directory

```bash
sudo mkdir -p /var/log/sudo-io
sudo chmod 700 /var/log/sudo-io
```

### Replay a recorded session

```bash
# List recorded sessions
sudo sudoreplay -l

# Replay a specific session
sudo sudoreplay 000001

# Replay at 2x speed
sudo sudoreplay -s 2 000001

# Search for sessions by user
sudo sudoreplay -l user jsmith

# Search for sessions by command
sudo sudoreplay -l command /usr/bin/systemctl
```

## Monitoring Sudo with auditd

auditd provides another layer of sudo monitoring with more structured event data:

```bash
sudo vi /etc/audit/rules.d/sudo.rules
```

```bash
# Watch the sudoers file for changes
-w /etc/sudoers -p wa -k sudoers_change
-w /etc/sudoers.d/ -p wa -k sudoers_change

# Track sudo executions
-a always,exit -F arch=b64 -S execve -F path=/usr/bin/sudo -k sudo_usage

# Track changes to the sudo log
-w /var/log/sudo.log -p wa -k sudo_log
```

```bash
# Load the rules
sudo augenrules --load

# Verify
sudo auditctl -l | grep sudo
```

### Search audit logs for sudo events

```bash
# Find all sudo usage
sudo ausearch -k sudo_usage --interpret

# Find sudo usage by a specific user
sudo ausearch -k sudo_usage -ua jsmith --interpret

# Find sudoers configuration changes
sudo ausearch -k sudoers_change --interpret
```

## Setting Up Alerts for Suspicious Sudo Activity

### Alert on failed sudo attempts

```bash
sudo vi /usr/local/bin/sudo-alert.sh
```

```bash
#!/bin/bash
# Check for failed sudo attempts in the last 5 minutes
SINCE=$(date -d '5 minutes ago' '+%b %e %H:%M')
FAILURES=$(grep "sudo:" /var/log/secure | grep "NOT in sudoers\|incorrect password\|authentication failure" | tail -20)

if [ -n "$FAILURES" ]; then
    echo "$FAILURES" | logger -p auth.alert -t sudo-alert
fi
```

```bash
sudo chmod 700 /usr/local/bin/sudo-alert.sh

# Run every 5 minutes
echo "*/5 * * * * root /usr/local/bin/sudo-alert.sh" | sudo tee /etc/cron.d/sudo-alert
```

### Things to watch for

- **Failed sudo attempts** - User not in sudoers, or wrong password.
- **Unusual commands** - sudo being used for commands not typical for that user.
- **Off-hours sudo usage** - Privileged commands at 3 AM on a Sunday.
- **Rapid-fire sudo commands** - Could indicate an automated attack.

## Analyzing Sudo Logs

### Count sudo usage by user

```bash
sudo grep "sudo:" /var/log/secure | awk '{print $6}' | sort | uniq -c | sort -rn
```

### Find commands run by a specific user

```bash
sudo grep "sudo:.*jsmith" /var/log/secure | grep "COMMAND=" | awk -F'COMMAND=' '{print $2}' | sort | uniq -c | sort -rn
```

### Find failed sudo attempts

```bash
sudo grep "sudo:" /var/log/secure | grep -E "NOT in sudoers|authentication failure|incorrect password"
```

### Generate a daily sudo report

```bash
sudo vi /usr/local/bin/sudo-report.sh
```

```bash
#!/bin/bash
# Daily sudo usage report
REPORT_DATE=$(date -d yesterday '+%b %e')
REPORT_FILE="/tmp/sudo-report-$(date -d yesterday '+%Y%m%d').txt"

echo "=== Sudo Usage Report for $REPORT_DATE ===" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "--- Command Count by User ---" >> "$REPORT_FILE"
grep "$REPORT_DATE" /var/log/secure | grep "sudo:.*COMMAND=" | \
    awk '{print $6}' | sort | uniq -c | sort -rn >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "--- Failed Attempts ---" >> "$REPORT_FILE"
grep "$REPORT_DATE" /var/log/secure | grep "sudo:" | \
    grep -E "NOT in sudoers|authentication failure" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "--- Unique Commands ---" >> "$REPORT_FILE"
grep "$REPORT_DATE" /var/log/secure | grep "COMMAND=" | \
    awk -F'COMMAND=' '{print $2}' | sort | uniq -c | sort -rn | head -20 >> "$REPORT_FILE"

# Send the report
mail -s "Sudo Report - $REPORT_DATE" security@example.com < "$REPORT_FILE"
rm -f "$REPORT_FILE"
```

```bash
sudo chmod 700 /usr/local/bin/sudo-report.sh
```

## Forwarding Sudo Logs to a SIEM

For centralized monitoring, forward sudo logs via rsyslog:

```bash
sudo vi /etc/rsyslog.d/sudo-forward.conf
```

```bash
# Forward sudo-related auth messages
if $programname == 'sudo' then {
    action(
        type="omfwd"
        target="siem.example.com"
        port="514"
        protocol="tcp"
    )
}
```

```bash
sudo systemctl restart rsyslog
```

## Wrapping Up

Sudo logging on RHEL should be a given, not an afterthought. At minimum, make sure sudo events are going to syslog and being retained. For sensitive environments, enable I/O logging to capture complete session recordings. Combine sudo logs with auditd rules for comprehensive monitoring, and forward everything to your SIEM for correlation with other security events. The goal is simple: know who did what, when, and from where.
