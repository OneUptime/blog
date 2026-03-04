# How to Analyze Authentication and Security Logs on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Security, Authentication, Logs, Auditing, SSH, PAM

Description: Learn where to find and how to analyze authentication and security logs on RHEL to detect unauthorized access attempts, failed logins, and suspicious activity.

---

RHEL records authentication events in several locations. Knowing where to look and what patterns to search for helps you detect brute-force attacks, unauthorized access, and account misuse.

## Key Log Files and Journal Sources

```bash
# /var/log/secure - PAM and authentication events (traditional file)
sudo tail -20 /var/log/secure

# /var/log/audit/audit.log - detailed audit events
sudo tail -20 /var/log/audit/audit.log

# Journal - authentication-related entries
journalctl -t sshd --since today
journalctl -t sudo --since today
journalctl -t login --since today
```

## Find Failed SSH Login Attempts

```bash
# Search for failed password attempts
sudo grep "Failed password" /var/log/secure

# Count failed attempts per IP address
sudo grep "Failed password" /var/log/secure | \
    awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head -20

# Find failed attempts using journalctl
journalctl -u sshd -p err --since "24 hours ago" | grep "Failed"
```

## Find Successful Logins

```bash
# List successful SSH logins
sudo grep "Accepted" /var/log/secure

# Use the last command for recent login history
last -20

# Show currently logged-in users
who
w
```

## Analyze sudo Usage

```bash
# Find all sudo commands executed
sudo grep "COMMAND" /var/log/secure

# Find failed sudo attempts
sudo grep "authentication failure" /var/log/secure | grep sudo

# Search via journal
journalctl -t sudo --since today
```

## Use ausearch for Audit Events

```bash
# Search for authentication events in the audit log
sudo ausearch -m USER_AUTH --start today

# Search for failed authentication events
sudo ausearch -m USER_AUTH -sv no --start today

# Search for user login events
sudo ausearch -m USER_LOGIN --start today

# Search for sudo events
sudo ausearch -m USER_CMD --start today

# Generate a summary report
sudo aureport --auth --summary
```

## Generate Authentication Reports

```bash
# Summary of authentication attempts
sudo aureport --auth

# Failed authentication report
sudo aureport --auth --failed

# Login report
sudo aureport --login

# Summary of all events by user
sudo aureport --user --summary
```

## Detect Brute-Force Patterns

```bash
# Find IPs with more than 10 failed attempts
sudo grep "Failed password" /var/log/secure | \
    awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | \
    awk '$1 > 10 {print $1, $2}'

# Check for accounts targeted by brute-force
sudo grep "Failed password" /var/log/secure | \
    awk '{print $(NF-5)}' | sort | uniq -c | sort -rn | head -10
```

## Monitor for Account Changes

```bash
# Detect user account modifications
sudo ausearch -m ADD_USER,DEL_USER,USER_MGMT --start today

# Detect password changes
sudo ausearch -m USER_CHAUTHTOK --start today

# Detect group membership changes
sudo ausearch -m ADD_GROUP,DEL_GROUP --start today
```

Regular review of authentication logs is a fundamental security practice. Automate these checks with cron jobs or integrate them with your monitoring system to catch issues early.
