# How to Set Password Policies and Expiration Rules on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, User Management, Linux, System Administration

Description: Learn how to configure password policies, expiration rules, and password complexity requirements on Ubuntu using chage, PAM, and related system tools.

---

Password policies are a basic security control for any multi-user system. On Ubuntu, password policy is handled through two complementary mechanisms: the `chage` command for managing password aging (expiration, minimum age, warning periods), and PAM (Pluggable Authentication Modules) for enforcing complexity requirements like minimum length, character classes, and history. This guide covers both.

## Understanding Password Aging with chage

The `chage` command reads and writes password aging information stored in `/etc/shadow`. Each user account has several aging-related fields:

```bash
# View current password aging settings for a user
sudo chage -l alice

# Example output:
# Last password change                                    : Feb 15, 2026
# Password expires                                        : never
# Password inactive                                       : never
# Account expires                                         : never
# Minimum number of days between password change          : 0
# Maximum number of days between password change          : 99999
# Number of days of warning before password expires       : 7
```

## Setting Password Expiration

```bash
# Set password to expire after 90 days
sudo chage -M 90 alice

# Require alice to change password at next login
sudo chage -d 0 alice
# -d 0 sets the "last changed" date to epoch 0, forcing immediate change

# Set minimum days between password changes (prevents rapid cycling)
sudo chage -m 7 alice  # User must keep password for at least 7 days

# Set warning period before expiration
sudo chage -W 14 alice  # Warn 14 days before expiration

# Set inactivity period (account locks N days after password expires)
sudo chage -I 30 alice  # Lock account 30 days after password expires

# Set account expiration date (account becomes unusable on this date)
sudo chage -E 2026-12-31 alice

# Remove account expiration
sudo chage -E -1 alice

# Apply all settings at once
sudo chage -m 7 -M 90 -W 14 -I 30 alice
```

## System-Wide Password Aging Defaults

The defaults for new user accounts are controlled by `/etc/login.defs`:

```bash
# View relevant settings
grep -E "PASS_|LOGIN_|MAX_|MIN_" /etc/login.defs | grep -v "^#"
```

Edit `/etc/login.defs` to set system-wide defaults:

```bash
sudo nano /etc/login.defs
```

Key settings to configure:

```
# /etc/login.defs - relevant password aging settings

PASS_MAX_DAYS   90      # Maximum days before password must change
PASS_MIN_DAYS   7       # Minimum days between changes
PASS_WARN_AGE   14      # Days before expiry to start warning
PASS_MIN_LEN    12      # Minimum password length (enforced by passwd)

# Account inactivity
INACTIVE        30      # Days after expiry before account is locked
```

These defaults apply to new accounts created with `useradd`. They do not retroactively affect existing accounts.

## Applying Expiration Rules to All Users

To apply a consistent policy across existing users:

```bash
#!/bin/bash
# apply-password-policy.sh
# Applies standard password aging to all regular users

MAX_DAYS=90
MIN_DAYS=7
WARN_DAYS=14
INACTIVE_DAYS=30

# Get all users with UID >= 1000 (human accounts)
awk -F: '$3 >= 1000 && $1 != "nobody" {print $1}' /etc/passwd | while read username; do
    echo "Applying policy to: $username"
    sudo chage \
        -M $MAX_DAYS \
        -m $MIN_DAYS \
        -W $WARN_DAYS \
        -I $INACTIVE_DAYS \
        "$username"
done

echo "Password policy applied to all user accounts"
```

```bash
chmod +x apply-password-policy.sh
sudo ./apply-password-policy.sh
```

## Password Complexity with PAM

Password aging controls when passwords must change. PAM controls what constitutes an acceptable password. Ubuntu uses `pam_pwquality` for password complexity:

```bash
# Install pam_pwquality if not present
sudo apt install libpam-pwquality
```

The configuration file is `/etc/security/pwquality.conf`:

```bash
# View current settings
cat /etc/security/pwquality.conf
```

Configure password complexity requirements:

```bash
sudo tee /etc/security/pwquality.conf << 'EOF'
# Minimum password length
minlen = 12

# Minimum number of different character classes required
# Classes: uppercase, lowercase, digits, special characters
minclass = 3

# Maximum number of consecutive identical characters allowed
maxrepeat = 2

# Maximum number of the same class of characters in a row
maxclassrepeat = 4

# Require at least N lowercase characters
lcredit = -1

# Require at least N uppercase characters
ucredit = -1

# Require at least N digits
dcredit = -1

# Require at least N special characters
ocredit = -1

# How many recent passwords to check (prevents reuse)
# Note: PAM remember setting controls the actual remembered count
remember = 12

# Minimum number of characters that differ from old password
difok = 8

# Check against common password dictionaries
dictcheck = 1

# Check if password matches username
usercheck = 1

# Enforce even for root (0 = enforce, 1 = exempt root)
enforce_for_root = 1
EOF
```

## Configuring PAM to Use the Policy

The PAM configuration files apply pwquality to login and password change attempts:

```bash
# View the common-password PAM configuration
cat /etc/pam.d/common-password
```

The relevant line should look like:

```
# /etc/pam.d/common-password
password        requisite                       pam_pwquality.so retry=3
```

To add history (prevent password reuse), modify `common-password`:

```bash
sudo cp /etc/pam.d/common-password /etc/pam.d/common-password.bak

sudo nano /etc/pam.d/common-password
```

Add the `remember` option to the pam_unix line:

```
# Old line:
password        [success=1 default=ignore]      pam_unix.so obscure yescrypt

# New line (adds remember=12):
password        [success=1 default=ignore]      pam_unix.so obscure yescrypt remember=12
```

This stores the last 12 password hashes in `/etc/security/opasswd` and rejects reuse.

## Testing Password Policies

```bash
# Test as a regular user - try to set a weak password
passwd

# Example rejection messages:
# New password: (type a weak password)
# BAD PASSWORD: The password is too short
# BAD PASSWORD: The password fails the dictionary check
# BAD PASSWORD: The password contains the user name in some form

# Test as root forcing a password change
sudo chage -d 0 testuser
# Next login for testuser will require immediate password change
```

## Account Locking After Failed Attempts

In addition to password complexity, configure account lockout for repeated failures. This uses `pam_tally2` or `pam_faillock` (Ubuntu 20.04+ uses faillock):

```bash
# Check faillock configuration
cat /etc/security/faillock.conf
```

Configure lockout policy:

```bash
sudo tee /etc/security/faillock.conf << 'EOF'
# Lock account after 5 failed attempts
deny = 5

# Lock the account for 15 minutes (900 seconds)
unlock_time = 900

# Check for failures even on root account
even_deny_root

# Failure tracking window (seconds)
fail_interval = 900

# Log failures via syslog
audit
EOF
```

Activate faillock in PAM:

```bash
# Add to /etc/pam.d/common-auth
sudo nano /etc/pam.d/common-auth
```

Ensure these lines are present (they may already be in Ubuntu 22.04+):

```
auth    required                        pam_faillock.so preauth
auth    [success=1 default=ignore]      pam_unix.so nullok
auth    [default=die]                   pam_faillock.so authfail
auth    sufficient                      pam_faillock.so authsucc
```

```bash
# Check failed attempts for a user
sudo faillock --user alice

# Manually unlock a locked account
sudo faillock --user alice --reset
```

## Monitoring Password Expiration

```bash
# Report on all users' password status
sudo passwd -S -a | column -t

# Find users with expired passwords
sudo chage --list --all 2>/dev/null | grep "expired"

# Script to list users with passwords expiring soon
#!/bin/bash
WARN_DAYS=14

awk -F: '$3 >= 1000 {print $1}' /etc/passwd | while read user; do
    days_left=$(sudo chage -l "$user" 2>/dev/null | grep "Password expires" | awk '{print $NF}')
    echo "$user: expires $days_left"
done | grep -v "never"
```

A layered password policy - aging rules to force regular changes, complexity requirements to ensure strong choices, and lockout to prevent brute force - provides meaningful protection for interactive accounts. Service accounts and system accounts should generally have passwords locked (`sudo passwd -l serviceaccount`) and authenticate through other mechanisms like SSH keys or API tokens.
