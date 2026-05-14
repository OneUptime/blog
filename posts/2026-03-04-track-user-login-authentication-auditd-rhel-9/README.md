# How to Track User Login and Authentication Events with auditd on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Auditd, Authentication, Monitoring, Linux

Description: Set up auditd rules on RHEL to monitor user logins, failed authentication attempts, and privilege escalation for security auditing.

---

Knowing who logged into your systems and when is fundamental to security. On RHEL, auditd gives you fine-grained control over what authentication events get recorded. Unlike basic utmp/wtmp logs, auditd can capture fuller context around each event, including related syscalls, processes, and user IDs involved.

This guide covers setting up audit rules specifically for login and authentication tracking.

## Prerequisites

Make sure auditd is installed and running:

```bash
# Verify auditd is active

sudo systemctl status auditd

# If not installed, install it
sudo dnf install audit -y
sudo systemctl enable --now auditd
```

## Key Authentication Files to Monitor

Authentication on RHEL touches several critical files. Monitoring changes to these files catches both legitimate and unauthorized modifications.

```mermaid
graph TD
    A[User Authentication] --> B[/etc/passwd]
    A --> C[/etc/shadow]
    A --> D[/etc/group]
    A --> E[/etc/gshadow]
    A --> F[/etc/security/]
    A --> G[/etc/pam.d/]
    A --> H[/etc/ssh/sshd_config]
```

### Create persistent audit rules for authentication files

```bash
sudo vi /etc/audit/rules.d/auth-tracking.rules
```

Add these rules:

```bash
# Monitor changes to user account files
-a always,exit -F arch=b64 -F path=/etc/passwd -F perm=wa -k user_accounts
-a always,exit -F arch=b64 -F path=/etc/shadow -F perm=wa -k user_accounts
-a always,exit -F arch=b64 -F path=/etc/group -F perm=wa -k group_changes
-a always,exit -F arch=b64 -F path=/etc/gshadow -F perm=wa -k group_changes

# Monitor PAM configuration changes
-a always,exit -F arch=b64 -F dir=/etc/pam.d/ -F perm=wa -k pam_config
-a always,exit -F arch=b64 -F dir=/etc/security/ -F perm=wa -k security_config

# Monitor SSH configuration
-a always,exit -F arch=b64 -F path=/etc/ssh/sshd_config -F perm=wa -k sshd_config

# Monitor sudoers changes
-a always,exit -F arch=b64 -F path=/etc/sudoers -F perm=wa -k sudoers_change
-a always,exit -F arch=b64 -F dir=/etc/sudoers.d/ -F perm=wa -k sudoers_change

# Monitor login configuration
-a always,exit -F arch=b64 -F path=/etc/login.defs -F perm=wa -k login_config
```

### Load the rules

```bash
# Load the new audit rules
sudo augenrules --load

# Verify the rules are active
sudo auditctl -l | grep -E "user_accounts|pam_config|sshd_config"
```

## Tracking Login Events with Syscall Rules

Beyond file watches, you can track specific syscalls related to authentication.

### Add syscall-based login tracking rules

```bash
sudo vi /etc/audit/rules.d/login-syscalls.rules
```

```bash
# Track execution of login-related programs
-a always,exit -F arch=b64 -S execve -F path=/usr/bin/login -k login_program
-a always,exit -F arch=b64 -S execve -F path=/usr/sbin/sshd -k login_program

# Track su and sudo usage
-a always,exit -F arch=b64 -S execve -F path=/usr/bin/su -k privilege_escalation
-a always,exit -F arch=b64 -S execve -F path=/usr/bin/sudo -k privilege_escalation

# Track user creation and modification commands
-a always,exit -F arch=b64 -S execve -F path=/usr/sbin/useradd -k user_management
-a always,exit -F arch=b64 -S execve -F path=/usr/sbin/userdel -k user_management
-a always,exit -F arch=b64 -S execve -F path=/usr/sbin/usermod -k user_management
-a always,exit -F arch=b64 -S execve -F path=/usr/bin/passwd -k password_change

# Track group management
-a always,exit -F arch=b64 -S execve -F path=/usr/sbin/groupadd -k group_management
-a always,exit -F arch=b64 -S execve -F path=/usr/sbin/groupdel -k group_management
-a always,exit -F arch=b64 -S execve -F path=/usr/sbin/groupmod -k group_management
```

```bash
sudo augenrules --load
```

## Monitoring PAM Authentication Events

PAM generates specific audit event types. The key event types to watch for:

| Event Type | Description |
|---|---|
| USER_AUTH | A user authentication attempt |
| USER_ACCT | A user account access check |
| USER_LOGIN | A user login event |
| USER_ERR | A user authentication error |
| CRED_ACQ | Credentials were acquired |
| CRED_REFR | Credentials were refreshed |

### Search for authentication events

```bash
# Find recent failed authentication attempts
sudo ausearch -m USER_AUTH --success no --start recent

# Find all successful logins today
sudo ausearch -m USER_LOGIN --success yes --start today

# Find all authentication errors
sudo ausearch -m USER_ERR --start today
```

## Building Useful Reports

The aureport tool summarizes audit data into readable reports.

### Generate an authentication report

```bash
# Summary of all authentication events
sudo aureport --auth

# Failed authentication summary
sudo aureport --auth --failed

# Login report showing all user logins
sudo aureport --login

# Failed login attempts only
sudo aureport --login --failed

# Summary by user
sudo aureport --user --summary
```

### Create a daily authentication report script

```bash
sudo vi /usr/local/bin/daily-auth-report.sh
```

```bash
#!/bin/bash
# Generate a daily authentication report and email it to the security team

REPORT_DATE=$(date -d yesterday '+%m/%d/%Y')
REPORT_FILE="/tmp/auth-report-$(date -d yesterday '+%Y%m%d').txt"

echo "=== Authentication Report for $REPORT_DATE ===" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "--- Failed Logins ---" >> "$REPORT_FILE"
aureport --login --failed --start "$REPORT_DATE 00:00:00" \
    --end "$REPORT_DATE 23:59:59" >> "$REPORT_FILE" 2>&1

echo "" >> "$REPORT_FILE"
echo "--- Failed Auth Attempts ---" >> "$REPORT_FILE"
aureport --auth --failed --start "$REPORT_DATE 00:00:00" \
    --end "$REPORT_DATE 23:59:59" >> "$REPORT_FILE" 2>&1

echo "" >> "$REPORT_FILE"
echo "--- User Account Changes ---" >> "$REPORT_FILE"
ausearch -k user_accounts --start "$REPORT_DATE 00:00:00" \
    --end "$REPORT_DATE 23:59:59" --interpret >> "$REPORT_FILE" 2>&1

echo "" >> "$REPORT_FILE"
echo "--- Privilege Escalation ---" >> "$REPORT_FILE"
ausearch -k privilege_escalation --start "$REPORT_DATE 00:00:00" \
    --end "$REPORT_DATE 23:59:59" --interpret >> "$REPORT_FILE" 2>&1

# Send the report via email
mail -s "RHEL Auth Report - $REPORT_DATE" security@example.com < "$REPORT_FILE"

# Clean up
rm -f "$REPORT_FILE"
```

```bash
sudo chmod 700 /usr/local/bin/daily-auth-report.sh
```

### Schedule the report with a systemd timer or cron

```bash
# Add a cron job to run daily at 6 AM
echo "0 6 * * * root /usr/local/bin/daily-auth-report.sh" | sudo tee /etc/cron.d/auth-report
```

## Tracking SSH Logins Specifically

SSH logins are usually the primary concern for remote servers.

```bash
# Find all SSH login attempts
sudo ausearch -m USER_LOGIN -x /usr/sbin/sshd --interpret

# Find SSH logins from a specific IP
sudo ausearch -m USER_LOGIN -x /usr/sbin/sshd --interpret | grep "addr=192.168.1.100"

# Count logins per user
sudo aureport --login --summary -i
```

## Tracking Failed su and sudo Attempts

Failed privilege escalation attempts are a red flag worth watching closely.

```bash
# Find failed sudo authentication attempts
sudo ausearch -m USER_AUTH,USER_ERR -x /usr/bin/sudo --success no --interpret --start today

# Find all su attempts
sudo ausearch -x /usr/bin/su --interpret --start today

# Check recent authentication events
sudo ausearch -m USER_AUTH,USER_ERR,USER_LOGIN --start recent -i
```

## Setting Up Real-Time Alerts

You can configure auditd to trigger alerts through the audit dispatcher.

### Create an alert script for failed logins

```bash
sudo vi /usr/local/bin/auth-alert.sh
```

```bash
#!/bin/bash
# Read audit events from stdin and alert on failed authentication
while read line; do
    if echo "$line" | grep -q "res=failed"; then
        USER=$(echo "$line" | grep -oP "acct=\K\S+")
        logger -p auth.alert "ALERT: Failed authentication for user $USER"
    fi
done
```

```bash
sudo chmod 700 /usr/local/bin/auth-alert.sh
```

Create an auditd plugin configuration so auditd sends events to the script:

```bash
sudo vi /etc/audit/plugins.d/auth-alert.conf
```

```ini
active = yes
path = /usr/local/bin/auth-alert.sh
type = always
args =
format = string
```

```bash
sudo auditctl --signal reload
```

## Protecting the Audit Trail

It is important to make sure nobody can tamper with the audit logs themselves.

```bash
# Make audit rules immutable until next reboot
# Add this as the LAST line in your rules file
echo "-e 2" | sudo tee -a /etc/audit/rules.d/99-finalize.rules
sudo augenrules --load
```

With immutable rules (`-e 2`), nobody can modify or disable audit rules without rebooting the system. This is a strong safeguard for compliance environments.

## Wrapping Up

Tracking authentication events with auditd on RHEL gives you a solid foundation for security monitoring. The combination of file and directory rules on critical auth files, syscall tracking for login-related binaries, and regular reporting with aureport covers most compliance requirements. The key is to review these logs regularly, whether manually or through automated SIEM integration, so you catch suspicious activity before it becomes a breach.
