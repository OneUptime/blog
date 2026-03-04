# How to Monitor SSH Configuration Changes with auditd on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, auditd, SSH, Security Monitoring, Linux

Description: Use auditd on RHEL to monitor changes to SSH configuration files and track who modifies your SSH server and client settings.

---

SSH is the primary remote access method on RHEL systems, making its configuration files a high-value target. Unauthorized changes to SSH settings can open security holes, weaken authentication, or enable backdoor access. Using auditd to monitor SSH configuration changes gives you a clear record of every modification. This guide shows you how to set it up.

## What SSH Files to Monitor

SSH configuration involves several files and directories:

```mermaid
flowchart TD
    A[SSH Configuration Files] --> B[Server Config]
    A --> C[Client Config]
    A --> D[Keys and Certificates]
    A --> E[Access Control]

    B --> B1[/etc/ssh/sshd_config]
    B --> B2[/etc/ssh/sshd_config.d/]
    C --> C1[/etc/ssh/ssh_config]
    C --> C2[/etc/ssh/ssh_config.d/]
    D --> D1[/etc/ssh/ssh_host_*]
    D --> D2[~/.ssh/authorized_keys]
    E --> E1[/etc/ssh/sshd_config AllowUsers]
    E --> E2[/etc/security/access.conf]
```

## Creating SSH Audit Rules

Create a dedicated rules file for SSH monitoring:

```bash
sudo tee /etc/audit/rules.d/50-ssh-monitoring.rules << 'EOF'
## SSH Configuration Monitoring Rules

# Monitor the main SSH server configuration file
-w /etc/ssh/sshd_config -p wa -k sshd_config_change

# Monitor the SSH server config drop-in directory
-w /etc/ssh/sshd_config.d/ -p wa -k sshd_config_change

# Monitor the SSH client configuration
-w /etc/ssh/ssh_config -p wa -k ssh_client_config_change
-w /etc/ssh/ssh_config.d/ -p wa -k ssh_client_config_change

# Monitor SSH host keys (these should rarely change)
-w /etc/ssh/ssh_host_rsa_key -p wa -k ssh_hostkey_change
-w /etc/ssh/ssh_host_rsa_key.pub -p wa -k ssh_hostkey_change
-w /etc/ssh/ssh_host_ecdsa_key -p wa -k ssh_hostkey_change
-w /etc/ssh/ssh_host_ecdsa_key.pub -p wa -k ssh_hostkey_change
-w /etc/ssh/ssh_host_ed25519_key -p wa -k ssh_hostkey_change
-w /etc/ssh/ssh_host_ed25519_key.pub -p wa -k ssh_hostkey_change

# Monitor the SSH daemon binary itself
-w /usr/sbin/sshd -p x -k sshd_execution

# Monitor PAM configuration for SSH
-w /etc/pam.d/sshd -p wa -k ssh_pam_change

# Monitor the SSH service unit file
-w /usr/lib/systemd/system/sshd.service -p wa -k ssh_service_change
-w /etc/systemd/system/sshd.service -p wa -k ssh_service_change
-w /etc/systemd/system/sshd.service.d/ -p wa -k ssh_service_change
EOF
```

## Monitoring authorized_keys Files

Monitoring authorized_keys files for all users requires a different approach because they are in user home directories:

```bash
# Add rules for specific users' authorized_keys files
sudo tee /etc/audit/rules.d/51-ssh-authorized-keys.rules << 'EOF'
## Monitor authorized_keys files

# Root user
-w /root/.ssh/ -p wa -k ssh_authorized_keys_change

# Monitor the system-wide authorized keys directory if configured
-w /etc/ssh/authorized_keys/ -p wa -k ssh_authorized_keys_change
EOF
```

For monitoring all users dynamically, you can generate rules with a script:

```bash
#!/bin/bash
# /usr/local/bin/gen-ssh-audit-rules.sh
# Generate audit rules for all user authorized_keys files

RULES_FILE="/etc/audit/rules.d/52-ssh-user-keys.rules"

echo "## Auto-generated authorized_keys monitoring rules" > "$RULES_FILE"

# Get all users with home directories and valid shells
while IFS=: read -r username _ uid _ _ homedir shell; do
    # Skip system users (UID < 1000) except root
    if [ "$uid" -ge 1000 ] || [ "$username" = "root" ]; then
        # Skip users with nologin shell
        if [[ "$shell" != */nologin ]] && [[ "$shell" != */false ]]; then
            if [ -d "$homedir/.ssh" ]; then
                echo "-w $homedir/.ssh/ -p wa -k ssh_user_keys_${username}" >> "$RULES_FILE"
            fi
        fi
    fi
done < /etc/passwd

echo "Rules generated in $RULES_FILE"
```

## Loading the Rules

```bash
# Load all audit rules
sudo augenrules --load

# Verify the SSH rules are loaded
sudo auditctl -l | grep ssh
```

You should see output like:

```
-w /etc/ssh/sshd_config -p wa -k sshd_config_change
-w /etc/ssh/sshd_config.d -p wa -k sshd_config_change
-w /etc/ssh/ssh_config -p wa -k ssh_client_config_change
...
```

## Testing the Rules

Trigger a test event to verify monitoring is working:

```bash
# Make a harmless change to test
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
sudo touch /etc/ssh/sshd_config

# Search for the event
sudo ausearch -k sshd_config_change -ts recent
```

You should see audit entries showing who touched the file, when, and from which process.

## Searching and Analyzing SSH Audit Events

### Find All SSH Configuration Changes

```bash
# Search for all SSH config changes
sudo ausearch -k sshd_config_change

# Search for SSH config changes today
sudo ausearch -k sshd_config_change -ts today

# Search for SSH config changes by a specific user
sudo ausearch -k sshd_config_change -ua admin_username
```

### Generate Reports

```bash
# Summary of SSH-related audit events
sudo ausearch -k sshd_config_change -i | head -50

# Count SSH config change events by day
sudo ausearch -k sshd_config_change --raw | awk -F'(' '{print $2}' | cut -d. -f1 | sort | uniq -c
```

### Interpreting the Audit Log

A typical audit entry for an SSH config change:

```
type=SYSCALL msg=audit(1709568000.456:789): arch=c000003e syscall=257
success=yes exit=3 a0=ffffff9c a1=55a5b2c04010 a2=241 a3=1b6
items=2 ppid=2345 pid=6789 auid=1000 uid=0 gid=0 euid=0 suid=0
fsuid=0 egid=0 sgid=0 fsgid=0 tty=pts0 ses=5 comm="vi"
exe="/usr/bin/vi" subj=unconfined_u:unconfined_r:unconfined_t:s0
key="sshd_config_change"
```

Key information:
- `auid=1000` tells you the original user who logged in
- `uid=0` tells you they were running as root (used sudo)
- `comm="vi"` tells you they used the vi editor
- `tty=pts0` tells you which terminal session
- `ses=5` is the session ID for correlating related events

## Setting Up Alerts for SSH Changes

Create a simple script that checks for SSH config changes and sends alerts:

```bash
#!/bin/bash
# /usr/local/bin/ssh-audit-alert.sh
# Check for recent SSH config changes and alert

LAST_CHECK_FILE="/var/run/ssh-audit-last-check"

if [ -f "$LAST_CHECK_FILE" ]; then
    LAST_CHECK=$(cat "$LAST_CHECK_FILE")
else
    LAST_CHECK="today"
fi

# Search for events since last check
EVENTS=$(sudo ausearch -k sshd_config_change -ts "$LAST_CHECK" 2>/dev/null)

if [ -n "$EVENTS" ] && ! echo "$EVENTS" | grep -q "no matches"; then
    echo "SSH configuration change detected on $(hostname):" | \
        systemd-cat -t ssh-audit-alert -p warning
    echo "$EVENTS" | systemd-cat -t ssh-audit-alert -p warning
fi

date +%H:%M:%S > "$LAST_CHECK_FILE"
```

## Summary

Monitoring SSH configuration changes with auditd on RHEL provides an essential security layer. By watching the SSH config files, host keys, authorized_keys files, and service definitions, you create a comprehensive audit trail that shows exactly who changed what and when. Set up the rules, verify they are working, and regularly review the audit logs to catch unauthorized modifications early.
