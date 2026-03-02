# How to Force a User to Change Password on Next Login on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, User Management, Password Policy, System Administration

Description: Force Ubuntu users to change their password on next login using passwd and chage, and configure system-wide password expiration policies for better security.

---

When you create a new user account and set an initial password, you almost always want that user to change it on first login. The same applies when resetting a forgotten password or responding to a security incident where credentials may have been compromised. Linux provides two tools for this: `passwd -e` for a quick one-shot expiry and `chage` for full password aging policy management.

## Forcing Password Change on Next Login

The simplest approach uses `passwd` with the `-e` (expire) flag:

```bash
# Expire the password immediately - user must change it on next login
sudo passwd -e username
```

This immediately marks the password as expired without changing it. On the next login, the system will prompt the user to set a new password before proceeding.

Verify the expiry is set:

```bash
sudo passwd -S username
```

Output:

```
username P 03/02/2026 0 99999 7 -1
```

The `P` means the password is set. The first date is when the password was last changed. A date far in the past or the epoch date indicates immediate expiry.

## Using chage for Detailed Control

`chage` (change age) manages password aging policies with more precision. It works by manipulating the `/etc/shadow` file entries.

### View current password aging information

```bash
sudo chage -l username
```

Output:

```
Last password change                                    : Mar 02, 2026
Password expires                                        : never
Password inactive                                       : never
Account expires                                         : never
Minimum number of days between password change          : 0
Maximum number of days between password change          : 99999
Number of days of warning before password expires       : 7
```

### Force a password change on next login with chage

```bash
# Set the last password change to the epoch (Jan 1, 1970) to force immediate expiry
sudo chage -d 0 username

# Verify
sudo chage -l username
# "Last password change" will show "Jan 01, 1970"
# "Password expires" will show "Jan 01, 1970" (already past, so expired)
```

This has the same effect as `passwd -e`, but uses a different mechanism.

## Setting Password Expiration Policies

### Maximum password age

Force users to change their password every 90 days:

```bash
# Set maximum password age to 90 days
sudo chage -M 90 username

# Set a warning 14 days before expiry
sudo chage -W 14 username
```

### Minimum password age

Prevent users from changing their password too frequently (stops them from immediately cycling back to the old password):

```bash
# Require at least 7 days between password changes
sudo chage -m 7 username
```

### Password inactivity period

Lock an account if the user hasn't logged in after the password expired:

```bash
# Lock account 30 days after password expiry if user hasn't changed it
sudo chage -I 30 username
```

### Combining all settings at once

```bash
# Set a complete password policy in one command:
# - Force change on next login (-d 0)
# - Max 90 days before next required change (-M 90)
# - Min 7 days between changes (-m 7)
# - Warn 14 days before expiry (-W 14)
# - Inactive lockout after 30 days (-I 30)
sudo chage -d 0 -M 90 -m 7 -W 14 -I 30 username
```

## System-Wide Default Password Aging

To apply default password aging settings to all new accounts, edit `/etc/login.defs`:

```bash
sudo nano /etc/login.defs
```

Find and modify these fields:

```
# Maximum number of days a password may be used
PASS_MAX_DAYS   90

# Minimum number of days allowed between password changes
PASS_MIN_DAYS   7

# Number of days warning given before a password expires
PASS_WARN_AGE   14
```

These defaults apply only to newly created accounts. Existing accounts retain their current settings. To update existing accounts, run `chage` on each one individually or use a script.

### Applying defaults to all existing users

```bash
#!/bin/bash
# Apply password aging policy to all local users with a password

# Get all users with a real home directory and UID >= 1000 (non-system users)
while IFS=: read -r user _ uid _ _ home _; do
    if [ "$uid" -ge 1000 ] && [ -d "$home" ]; then
        echo "Setting password policy for: $user"
        sudo chage -M 90 -m 7 -W 14 -I 30 "$user"
    fi
done < /etc/passwd
```

## Checking Password Expiry Across All Users

Audit password expiry settings for all accounts:

```bash
# Show password aging for all users
for user in $(cut -d: -f1 /etc/passwd); do
    echo "=== $user ==="
    sudo chage -l "$user" 2>/dev/null | grep -E "expires|Last password"
done
```

Find users with passwords that never expire:

```bash
# Users where password max age is 99999 (never expires)
sudo awk -F: '$5 == 99999 {print $1}' /etc/shadow
```

Find users with expired passwords right now:

```bash
# This leverages chage's exit codes
for user in $(cut -d: -f1 /etc/shadow | grep -v '^#'); do
    sudo chage -l "$user" 2>/dev/null | grep -q "password must be changed" && echo "$user: PASSWORD EXPIRED"
done
```

## Account Expiration vs Password Expiration

These are different concepts and worth keeping straight:

- **Password expiration** (`chage -M`) - the password must be changed after N days. The account still exists, the user just gets prompted to set a new password at login.
- **Account expiration** (`chage -E`) - the account itself is disabled on a specific date. The user cannot log in at all.

```bash
# Expire the account on a specific date (for contractors or temporary access)
sudo chage -E 2026-06-30 contractor_user

# Remove account expiration date
sudo chage -E -1 username
```

## Testing the Forced Change

After setting a forced password change, verify it works by connecting as that user:

```bash
# Test via sudo su (simulates a login)
sudo su - username
```

Or SSH from another terminal:

```bash
ssh username@localhost
```

The session should prompt:

```
WARNING: Your password has expired.
You must change your password now and login again!
Changing password for username.
Current password:
New password:
Retype new password:
```

After changing, the user is logged out and must reconnect with the new password. This confirms the mechanism is working correctly.

Forcing password changes on new accounts and setting sensible aging policies are foundational security practices. Combined with strong password requirements configured through PAM (`libpam-pwquality`), they significantly reduce the risk from weak or reused credentials.
