# How to Set Up Account Lockout Policies on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, PAM, Authentication, Hardening

Description: Guide to configuring automatic account lockout on Ubuntu after failed login attempts using pam_faillock, including lockout duration, unlock procedures, and per-service configuration.

---

Brute force attacks against local accounts and SSH are a constant threat. Without any lockout policy, an attacker has unlimited time to try passwords. Ubuntu's PAM framework includes `pam_faillock`, which tracks failed authentication attempts and temporarily locks accounts after a configurable threshold is reached.

This tutorial covers setting up account lockout for local logins, SSH, and sudo, along with monitoring and unlocking accounts.

## The pam_faillock Module

`pam_faillock` replaced the older `pam_tally2` module in Ubuntu 20.04 and later. It records failed authentication attempts in per-user files under `/var/run/faillock/` and checks those counts during authentication.

The module has two roles in the PAM stack:
- **auth phase**: Checks whether the account is currently locked before attempting authentication
- **account phase**: Increments the failure counter on authentication failure

## Installing Required Packages

```bash
# pam_faillock is part of libpam-modules, installed by default
dpkg -l libpam-modules

# Verify the module exists
ls /lib/x86_64-linux-gnu/security/pam_faillock.so
```

## Configuring faillock

The primary configuration file is `/etc/security/faillock.conf`:

```bash
# Backup the original
sudo cp /etc/security/faillock.conf /etc/security/faillock.conf.bak

sudo nano /etc/security/faillock.conf
```

A practical lockout policy:

```ini
# /etc/security/faillock.conf

# Directory where per-user failure records are stored
dir = /var/run/faillock

# Number of failed attempts before lockout
deny = 5

# Time window (seconds) in which failures are counted
# 900 seconds = 15 minutes
fail_interval = 900

# Duration (seconds) the account stays locked
# 900 seconds = 15 minutes (0 = manual unlock required)
unlock_time = 900

# Lock root account as well (recommended for non-console environments)
even_deny_root = true

# How long root stays locked (shorter than regular users is often sensible)
root_unlock_time = 60

# Audit log all lockout events
audit = true

# Show a message indicating the remaining unlock time
no_log_info = false
```

## Configuring the PAM Stack

Edit the PAM files to integrate `pam_faillock`. The changes go into two files.

### /etc/pam.d/common-auth

```bash
sudo cp /etc/pam.d/common-auth /etc/pam.d/common-auth.bak
sudo nano /etc/pam.d/common-auth
```

Add the faillock lines around the primary authentication module:

```
# Check if account is locked BEFORE attempting authentication
auth  required  pam_faillock.so preauth

# Attempt authentication (pam_unix handles local accounts)
auth  [success=1 default=ignore]  pam_unix.so nullok

# If auth failed, record the failure
auth  [default=die]  pam_faillock.so authfail

# If auth succeeded, reset the failure counter
auth  sufficient  pam_faillock.so authsucc

auth  requisite  pam_deny.so
auth  required   pam_permit.so
```

### /etc/pam.d/common-account

```bash
sudo cp /etc/pam.d/common-account /etc/pam.d/common-account.bak
sudo nano /etc/pam.d/common-account
```

Add the account check:

```
# pam_faillock account phase enforces the lockout
account  required  pam_faillock.so

account  [success=1 new_authtok_reqd=done default=ignore]  pam_unix.so
account  requisite  pam_deny.so
account  required   pam_permit.so
```

## Testing the Lockout Policy

Create a test user and verify lockout behavior:

```bash
# Create a test user
sudo useradd -m -s /bin/bash testlockout
sudo passwd testlockout

# Attempt incorrect logins (run from another terminal)
su - testlockout  # wrong password, repeat 5+ times

# After enough failures, the account is locked
# Even the correct password will be rejected

# Check the failure count
sudo faillock --user testlockout
```

The output from `faillock` shows:

```
testlockout:
When                Type  Source                                           Valid
2026-03-02 10:15:22 RHOST 192.168.1.50                                    V
2026-03-02 10:15:25 RHOST 192.168.1.50                                    V
...
```

## Unlocking Accounts

When a legitimate user gets locked out:

```bash
# Reset the failure counter and unlock the account
sudo faillock --user username --reset

# Verify the account is unlocked
sudo faillock --user username
```

## Monitoring Lockout Events

Failed attempts are logged to syslog:

```bash
# View recent lockout events
sudo grep 'pam_faillock\|FAILED LOGIN\|authentication failure' /var/log/auth.log | tail -30

# Watch for lockouts in real time
sudo tail -f /var/log/auth.log | grep -i 'faillock\|failed\|locked'

# Count lockout events by user
sudo grep 'user lockout' /var/log/auth.log | awk '{print $NF}' | sort | uniq -c | sort -rn
```

## Per-Service Configuration

Some services need different lockout policies. You can configure per-service overrides by editing specific PAM files.

### Stricter SSH Lockout

For SSH, you might want fewer attempts before lockout:

```bash
sudo nano /etc/pam.d/sshd
```

Add at the top:

```
# SSH-specific faillock - lock after 3 failures, unlock after 30 minutes
auth  required  pam_faillock.so preauth deny=3 unlock_time=1800

# ... rest of existing auth lines ...

auth  [default=die]  pam_faillock.so authfail deny=3 unlock_time=1800
auth  sufficient  pam_faillock.so authsucc
```

Also ensure SSH PAM integration is enabled in sshd_config:

```bash
grep -E '^UsePAM|^ChallengeResponseAuthentication' /etc/ssh/sshd_config
# UsePAM yes
```

### Relaxed sudo Lockout

For sudo, you may want to exclude it from lockout to prevent administrators from locking themselves out:

```bash
# Check the sudo PAM config
cat /etc/pam.d/sudo
```

If you use `@include common-auth`, faillock applies to sudo too. To exclude sudo, add a direct auth line that bypasses faillock:

```
auth  sufficient  pam_unix.so
```

Be cautious with this approach - it weakens sudo brute force protection.

## Handling the pam_faillock Storage Directory

By default, faillock records live in `/var/run/faillock/`, which is cleared on reboot:

```bash
# View all locked accounts
sudo faillock

# View files in the faillock directory
ls -la /var/run/faillock/
```

To persist failure records across reboots (so reboot cannot be used to reset counters), change the directory to a persistent location:

```ini
# In /etc/security/faillock.conf
dir = /var/lib/faillock
```

```bash
# Create the directory with appropriate permissions
sudo mkdir -p /var/lib/faillock
sudo chmod 755 /var/lib/faillock
```

## Integrating with fail2ban

For SSH specifically, `fail2ban` complements `pam_faillock` by banning the remote IP rather than just the local account:

```bash
sudo apt-get install -y fail2ban

# Basic SSH protection
sudo tee /etc/fail2ban/jail.d/ssh.conf <<EOF
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
findtime = 600
bantime = 3600
EOF

sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

This provides two layers: pam_faillock locks the user account, fail2ban blocks the IP.

## Common Issues

**Account locked after system restarts when using /var/run**: The tmpfs at `/var/run` clears on reboot. Move the directory to `/var/lib/faillock` if persistence is needed.

**Root cannot log in after lockout**: If `even_deny_root` is set, you need console access to unlock root, or rely on the shorter `root_unlock_time` timeout.

**PAM configuration order wrong**: If `pam_faillock.so preauth` is after `pam_unix.so`, the failure count is never checked before attempting authentication. Always put `preauth` first.

Account lockout policies are a straightforward control with significant impact. Combined with password complexity rules and key-based SSH authentication, they substantially raise the cost of brute force attacks against Ubuntu systems.
