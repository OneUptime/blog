# How to Restrict cron and at Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Cron, Hardening, System Administration

Description: Guide to restricting which users can schedule jobs with cron and at on Ubuntu using allow/deny files, with verification steps and integration with security auditing.

---

The `cron` and `at` daemons allow users to schedule commands for later execution. On multi-user systems, unrestricted access to these schedulers is a security risk: any user can execute arbitrary code on a schedule, persist malicious scripts, and evade monitoring if administrators are not watching crontabs carefully. Restricting who can use cron and at is a basic hardening step that should be part of any Ubuntu server baseline.

## How cron and at Access Control Works

Both daemons use a simple allow/deny file system:

- If `/etc/cron.allow` exists, only users listed in it can use crontab
- If `/etc/cron.allow` does not exist but `/etc/cron.deny` does, users listed in cron.deny are blocked and everyone else is allowed
- If neither file exists, only root can use crontab (on some systems) or everyone can (on others - behavior is implementation-dependent)
- The same logic applies to `at` using `/etc/at.allow` and `/etc/at.deny`

The safest configuration is to have an explicit allow list. Deny lists are weaker because new users added to the system are automatically permitted unless someone remembers to add them to the deny file.

## Restricting cron Access

### Creating a cron.allow File

Create the allow file with only the users who need cron access:

```bash
# Create cron.allow with authorized users
sudo tee /etc/cron.allow <<EOF
root
deploy
backup-agent
monitoring
EOF

# Set appropriate permissions
sudo chmod 600 /etc/cron.allow
sudo chown root:root /etc/cron.allow
```

Once cron.allow exists, any user not in the file will get a denial when they try to use crontab:

```
You (testuser) are not allowed to use this program (crontab)
See crontab(1) for more information
```

### Removing cron.deny

If `cron.deny` exists alongside `cron.allow`, the allow list takes precedence on most systems. However, to avoid confusion, keep only one control file:

```bash
# If cron.deny exists and you're switching to allow-list model, remove it
sudo rm -f /etc/cron.deny
```

### Verifying cron Access Control

Test that an unauthorized user cannot schedule jobs:

```bash
# Switch to a test user
sudo su - testuser

# Attempt to list or edit crontab
crontab -l
# Output: You (testuser) are not allowed to use this program (crontab)

# Attempt to edit
crontab -e
# Output: You (testuser) are not allowed to use this program (crontab)
```

As root, view all installed crontabs to audit scheduled jobs:

```bash
# List all user crontab files
ls -la /var/spool/cron/crontabs/

# View a specific user's crontab
sudo cat /var/spool/cron/crontabs/deploy

# Check system-wide cron directories
ls -la /etc/cron.d/
ls -la /etc/cron.daily/
ls -la /etc/cron.weekly/
ls -la /etc/cron.monthly/
```

## Restricting at Access

The `at` command schedules one-time jobs. The same allow/deny mechanism applies:

```bash
# Create at.allow with authorized users
sudo tee /etc/at.allow <<EOF
root
deploy
EOF

sudo chmod 600 /etc/at.allow
sudo chown root:root /etc/at.allow

# Remove at.deny if it exists
sudo rm -f /etc/at.deny
```

Verify the restriction:

```bash
# As an unauthorized user
echo "id" | at now + 1 minute
# Output: You do not have permission to use at.

# As an authorized user
sudo su - deploy
echo "id > /tmp/at-test" | at now + 1 minute
# Output: job 1 at Mon Mar  2 12:00:00 2026
```

## Auditing Existing Scheduled Jobs

Before locking down cron access, audit what is currently scheduled:

```bash
# View all user crontabs
for user in $(cut -f1 -d: /etc/passwd); do
    if sudo crontab -u "$user" -l 2>/dev/null | grep -v '^#' | grep -v '^$'; then
        echo "=== $user ==="
    fi
done

# Check system cron directories
echo "=== /etc/cron.d/ ==="
ls -la /etc/cron.d/
grep -r '' /etc/cron.d/ 2>/dev/null

echo "=== /etc/crontab ==="
cat /etc/crontab

# Check the at queue
sudo atq
```

## Securing the cron Directories

The system cron directories (`cron.daily`, `cron.weekly`, etc.) are not subject to cron.allow restrictions - they are managed by root and executed by the cron daemon directly. Ensure only root can write to them:

```bash
# Check permissions on cron directories
ls -la /etc/ | grep cron

# Set strict permissions
sudo chmod 700 /etc/cron.d
sudo chmod 700 /etc/cron.daily
sudo chmod 700 /etc/cron.weekly
sudo chmod 700 /etc/cron.monthly
sudo chmod 700 /etc/cron.hourly

# Ensure root owns all cron directories and files
sudo chown root:root /etc/cron.d
sudo chown root:root /etc/cron.daily
sudo chown root:root /etc/cron.weekly
sudo chown root:root /etc/cron.monthly
sudo chown root:root /etc/cron.hourly

# Remove world or group write permissions from any scripts in cron directories
find /etc/cron.* -type f -exec sudo chmod go-w {} \;
```

## Protecting the Crontab Spool Directory

```bash
# The spool directory should only be readable by root
ls -la /var/spool/cron/
# drwx--x--x 2 root crontab 4096 ...

# Check crontabs directory permissions
ls -la /var/spool/cron/crontabs/
# drwx-wx--T 2 root crontab 4096 ...

# The sticky bit (T) prevents users from deleting each other's crontab files
```

## Monitoring Cron Activity

With restrictions in place, monitor cron execution to detect anomalies:

```bash
# View recent cron activity
grep CRON /var/log/syslog | tail -50

# Find all cron executions in the last hour
grep CRON /var/log/syslog | grep "$(date +%b %_d %H)"

# Set up an alert for unexpected cron users
# Check daily if new users have appeared in cron.allow or crontabs
cat /etc/cron.daily/check-cron-access  # You would create this script
```

A simple monitoring script:

```bash
sudo tee /etc/cron.daily/audit-cron <<'SCRIPT'
#!/bin/bash
# Daily audit of cron access and activity

ALERT_EMAIL="sysadmin@company.com"

# Check for unauthorized crontab files (users not in cron.allow)
ALLOWED=$(cat /etc/cron.allow 2>/dev/null)
ISSUES=""

for crontab_file in /var/spool/cron/crontabs/*; do
    user=$(basename "$crontab_file")
    if ! echo "$ALLOWED" | grep -qx "$user"; then
        ISSUES="$ISSUES\nWarning: $user has a crontab but is not in cron.allow"
    fi
done

if [ -n "$ISSUES" ]; then
    echo -e "Cron access audit issues:\n$ISSUES" | \
        mail -s "Cron Audit Alert" "$ALERT_EMAIL"
fi
SCRIPT

sudo chmod 755 /etc/cron.daily/audit-cron
```

## Integration with AppArmor

For an additional layer, AppArmor can restrict what cron-executed scripts can do:

```bash
# Check if AppArmor is active
sudo aa-status | head -5

# View the cron AppArmor profile
cat /etc/apparmor.d/usr.sbin.cron 2>/dev/null || echo "No cron AppArmor profile found"
```

AppArmor profiles for cron-run scripts prevent them from accessing files or executing commands outside their defined scope, limiting the blast radius of a compromised scheduled job.

## Summary of Recommendations

For a hardened Ubuntu server:

1. Create `/etc/cron.allow` with an explicit list of users who need cron access
2. Create `/etc/at.allow` with an explicit list for the at command
3. Remove `/etc/cron.deny` and `/etc/at.deny` to avoid ambiguity
4. Set 700 permissions on all cron directories
5. Audit existing crontabs before applying restrictions
6. Set up logging to monitor cron activity
7. Review the cron.allow file whenever users are added or removed from the system

Cron restriction is a quick win - it takes minutes to configure but eliminates an entire class of persistence mechanisms that attackers might otherwise exploit on a compromised system.
