# How to Restrict Cron Access to Specific Users on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, Security, User Management

Description: Learn how to control which users can schedule cron jobs on Ubuntu using cron.allow and cron.deny files, and best practices for cron access management.

---

By default, every user on an Ubuntu system can create their own crontab and schedule jobs. In multi-user environments or on shared servers, you may want to restrict this capability. Linux provides a simple allow/deny file mechanism for controlling cron access.

## How Cron Access Control Works

Cron checks two files when a user tries to edit or install a crontab:

- `/etc/cron.allow` - If this file exists, only users listed in it can use cron
- `/etc/cron.deny` - If this file exists (and cron.allow does not), users listed here cannot use cron

The logic is:

1. If `/etc/cron.allow` exists:
   - User must be in this file to use cron
   - `/etc/cron.deny` is ignored
   - Users not in the file get "you are not allowed to use this program"

2. If only `/etc/cron.deny` exists:
   - Users listed here cannot use cron
   - Everyone else can use cron

3. If neither file exists:
   - On Ubuntu, the default behavior depends on the cron implementation
   - With the `cron` package on Ubuntu, everyone can use cron by default

4. If both files are empty or `/etc/cron.deny` is empty with no `/etc/cron.allow`:
   - Everyone can use cron

## Checking the Current State

```bash
# Check if access control files exist
ls -la /etc/cron.allow /etc/cron.deny 2>/dev/null

# View the files if they exist
cat /etc/cron.allow
cat /etc/cron.deny

# Check who is currently allowed to edit crontabs
# (No direct command - check the files above)
```

On a fresh Ubuntu installation, these files typically do not exist, meaning all users can use cron.

## Restricting Cron to a List of Allowed Users

To create an allowlist (only named users can schedule cron jobs):

```bash
# Create cron.allow with specific users
sudo tee /etc/cron.allow << 'EOF'
root
admin
deploy
webadmin
EOF

# Verify
cat /etc/cron.allow
```

After this, any user not in `/etc/cron.allow` who tries to edit their crontab will see:

```text
You (username) are not allowed to use this program (crontab)
```

Note that `root` should generally always be in the allow list. If root is not listed and `cron.allow` exists, even root will be denied.

## Blocking Specific Users with cron.deny

If you want everyone to have cron access except specific users, use `cron.deny`:

```bash
# Create cron.deny with users to block
sudo tee /etc/cron.deny << 'EOF'
guest
testuser
tempworker
EOF
```

These users will be denied cron access while all others remain allowed.

```bash
# Test that a denied user cannot edit crontabs
sudo -u testuser crontab -e
# Output: You (testuser) are not allowed to use this program (crontab)
```

## Working with System Service Accounts

Service accounts (like `www-data`, `mysql`, `postgres`) can be given cron access through the system crontab rather than user crontabs:

```bash
# Instead of allowing www-data to edit crontabs,
# add jobs for www-data in /etc/cron.d/
sudo tee /etc/cron.d/webapp << 'EOF'
# Run cleanup as www-data user
0 2 * * * www-data /var/www/html/cleanup.sh

# Run cache warming as www-data
*/30 * * * * www-data /var/www/html/warm-cache.sh
EOF
```

This way the service account runs scheduled jobs without needing cron.allow access or a personal crontab.

## Verifying User Permissions

To check whether a user has cron access:

```bash
# Simulate crontab access as a user
sudo -u username crontab -l

# If denied, you will see:
# You (username) are not allowed to use this program (crontab)

# If allowed with no crontab installed:
# no crontab for username
```

## Auditing Existing Crontabs

Before restricting cron access, find out who already has crontabs configured:

```bash
# List all users with crontabs in /var/spool/cron/crontabs/
sudo ls -la /var/spool/cron/crontabs/

# View each user's crontab
for user in $(sudo ls /var/spool/cron/crontabs/); do
    echo "=== Crontab for $user ==="
    sudo crontab -u "$user" -l
    echo ""
done
```

This lets you review what jobs are currently scheduled before you lock down access.

## Preserving Existing Jobs When Restricting Access

If a user already has a crontab and you remove their access, their jobs will not run but the crontab file remains. Before restricting a user, move their jobs to a system crontab:

```bash
# View the user's current crontab
sudo crontab -u olduser -l

# Migrate their jobs to /etc/cron.d/ (run as appropriate user)
sudo tee /etc/cron.d/migrated-from-olduser << 'EOF'
# Previously in olduser's crontab - migrated 2026-03-02
MAILTO="admin@example.com"

0 2 * * * olduser /home/olduser/backup.sh
*/5 * * * * olduser /home/olduser/monitor.sh
EOF

# Then remove the user's crontab
sudo crontab -r -u olduser

# Finally, add the user to cron.deny or remove from cron.allow
echo "olduser" | sudo tee -a /etc/cron.deny
```

## Cron Access Control for System Administrators

Best practices for managing cron access in a shared environment:

```bash
# Approach 1: Explicit allowlist (more restrictive)
sudo tee /etc/cron.allow << 'EOF'
root
# System administrators
sysadmin
admin

# Deployment users
deploy
cicd

# Application accounts that need cron access
appuser
EOF

# Approach 2: Denylist (more permissive, block specific users)
sudo tee /etc/cron.deny << 'EOF'
# Guest and temporary accounts
guest
temp
testuser

# Low-privilege web server users
www-data
nginx
apache2
EOF
```

## Combining with PAM for Fine-Grained Control

On Ubuntu, cron also integrates with PAM (Pluggable Authentication Modules). The PAM configuration for cron is at `/etc/pam.d/cron`:

```bash
# View current PAM cron configuration
cat /etc/pam.d/cron
```

You can add additional restrictions here, such as requiring group membership:

```bash
# Allow only users in the 'cron-users' group
# First create the group
sudo groupadd cron-users

# Add allowed users to the group
sudo usermod -aG cron-users deploy
sudo usermod -aG cron-users admin

# Add PAM restriction (requires pam_succeed_if)
sudo tee -a /etc/pam.d/cron << 'EOF'
# Only allow users in the cron-users group or root
account required pam_succeed_if.so user ingroup cron-users
EOF
```

Note: PAM-based restrictions are more complex and less portable than cron.allow/cron.deny. Test changes carefully in a non-production environment first.

## Monitoring Cron Access Attempts

Log access denials to keep an eye on who is trying to use cron:

```bash
# Cron typically logs to syslog
# Denied access appears in:
sudo grep "not allowed" /var/log/syslog | tail -20

# Using journalctl
sudo journalctl -u cron | grep "not allowed"
```

## At Command Access Control

The `at` command has similar access control files:

```bash
# Allow/deny access to the 'at' command
cat /etc/at.allow
cat /etc/at.deny

# Same logic as cron - at.allow takes precedence over at.deny
# Add users to at.allow for restrictive mode:
echo "deploy" | sudo tee -a /etc/at.allow
```

If you restrict cron access, consider restricting at access too to prevent users from scheduling one-time jobs as a workaround.

## Summary

Controlling cron access on Ubuntu comes down to two files: `/etc/cron.allow` and `/etc/cron.deny`. For maximum security, create `/etc/cron.allow` with an explicit list of users who need scheduling capability. This denies all others by default. For more permissive environments, use `/etc/cron.deny` to block specific problem users. Before implementing restrictions, audit existing crontabs and migrate any jobs from restricted users to system crontabs in `/etc/cron.d/`. Always include `root` in any allow list to prevent locking out administrative access.
