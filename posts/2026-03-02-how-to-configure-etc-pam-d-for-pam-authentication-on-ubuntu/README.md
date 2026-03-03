# How to Configure /etc/pam.d for PAM Authentication on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Authentication, PAM, Linux

Description: A practical guide to configuring Pluggable Authentication Modules (PAM) on Ubuntu via /etc/pam.d, covering module types, control flags, and real-world use cases.

---

Pluggable Authentication Modules (PAM) is the authentication framework that sits between applications and the actual user verification logic on Linux. On Ubuntu, every service that needs to authenticate users - SSH, sudo, login, su - delegates that work to PAM. The configuration files live in `/etc/pam.d/`, and understanding how to work with them gives you fine-grained control over who can authenticate, how they authenticate, and what happens after they do.

## How PAM Works

When an application needs to authenticate a user, it makes a call to the PAM library. PAM then reads the appropriate file in `/etc/pam.d/` and executes a stack of modules in order. Each module performs a specific check and returns either success or failure. The overall outcome depends on the control flags associated with each module.

The name of the file in `/etc/pam.d/` typically matches the service name. For example, SSH authentication is governed by `/etc/pam.d/sshd`, and sudo uses `/etc/pam.d/sudo`.

## PAM File Structure

Each line in a PAM configuration file follows this format:

```text
type  control  module-path  [module-arguments]
```

### Module Types

PAM has four module types:

- `auth` - Verifies identity (password check, MFA tokens)
- `account` - Checks account properties (expired, locked, time restrictions)
- `password` - Handles password changes and policy enforcement
- `session` - Sets up and tears down user sessions (mounts, environment variables)

### Control Flags

Control flags determine what happens when a module succeeds or fails:

- `required` - Must succeed; failure is noted but other modules still run
- `requisite` - Must succeed; failure immediately ends the stack
- `sufficient` - If it succeeds and no previous `required` modules failed, authentication succeeds immediately
- `optional` - Result ignored unless it's the only module for that type
- `include` - Reads in another PAM file's configuration for that type

## Viewing Existing Configuration

Before making changes, review what's already there:

```bash
# View the sshd PAM config
cat /etc/pam.d/sshd

# View the sudo PAM config
cat /etc/pam.d/sudo

# List all PAM configuration files
ls /etc/pam.d/
```

A typical `/etc/pam.d/sshd` on Ubuntu looks something like this:

```text
# Standard Un*x authentication.
@include common-auth

# Disallow non-root logins when /etc/nologin exists.
account    required     pam_nologin.so

# Uncomment and edit /etc/security/access.conf if you need to
# set complex access limits that are hard to express in sshd_config.
account  required     pam_access.so

# Standard Un*x authorization.
@include common-account

# SELinux needs to be the first session rule. This ensures that any
# failure will stop the session setup process.
session [success=ok ignore=ignore module_unknown=ignore default=bad]        pam_selinux.so close

# Standard Un*x session setup and teardown.
@include common-session

# Print the message of the day upon successful login.
session    optional     pam_motd.so  motd=/run/motd.dynamic
session    optional     pam_motd.so noupdate

# Print the status of the user's mailbox upon successful login.
session    optional     pam_mail.so standard noenv # [1]
```

## Common PAM Modules

Ubuntu ships with a large collection of PAM modules. These are the ones you'll encounter most often:

- `pam_unix.so` - Traditional Unix password authentication
- `pam_ldap.so` - LDAP authentication
- `pam_google_authenticator.so` - TOTP-based two-factor authentication
- `pam_limits.so` - Resource limits (reads from `/etc/security/limits.conf`)
- `pam_access.so` - Login access control (reads from `/etc/security/access.conf`)
- `pam_time.so` - Time-based access restrictions
- `pam_env.so` - Set environment variables on login
- `pam_tally2.so` / `pam_faillock.so` - Account lockout after failed attempts

## Example: Enforcing Account Lockout

One of the most practical PAM configurations is locking accounts after repeated failed login attempts. On Ubuntu 20.04 and later, `pam_faillock` is the preferred module:

```bash
# Edit the common-auth file
sudo nano /etc/pam.d/common-auth
```

Add these lines at the top and bottom of the auth stack:

```text
# At the very beginning of the auth stack
auth    required                        pam_faillock.so preauth silent audit deny=5 unlock_time=900

# After the standard Unix auth line
auth    [default=die]                   pam_faillock.so authfail audit deny=5 unlock_time=900
auth    sufficient                      pam_faillock.so authsucc audit deny=5 unlock_time=900
```

Configure the faillock settings in `/etc/security/faillock.conf`:

```bash
sudo nano /etc/security/faillock.conf
```

```ini
# Number of failed attempts before lockout
deny = 5

# Lockout duration in seconds (900 = 15 minutes)
unlock_time = 900

# Only count failures in the last 15 minutes
fail_interval = 900

# Audit failed attempts via syslog
audit

# Treat root the same as other users
even_deny_root
```

Check and reset locked accounts:

```bash
# Check failed attempts for a user
sudo faillock --user username

# Reset a locked account
sudo faillock --user username --reset
```

## Example: Adding Two-Factor Authentication for SSH

To require TOTP in addition to a password for SSH logins:

```bash
# Install Google Authenticator PAM module
sudo apt install libpam-google-authenticator

# Edit sshd PAM config
sudo nano /etc/pam.d/sshd
```

Add this line to the auth section:

```text
auth required pam_google_authenticator.so nullok
```

The `nullok` argument allows users who haven't set up TOTP to still log in - remove it once everyone has configured their tokens.

Also update `/etc/ssh/sshd_config`:

```bash
# Edit sshd_config
sudo nano /etc/ssh/sshd_config
```

```text
ChallengeResponseAuthentication yes
AuthenticationMethods keyboard-interactive
```

```bash
# Restart SSH
sudo systemctl restart sshd
```

Each user then runs `google-authenticator` to generate their TOTP secret:

```bash
google-authenticator
```

## Example: Restricting Login Times

Use `pam_time` to prevent logins outside business hours:

```bash
sudo nano /etc/pam.d/sshd
```

Add to the account section:

```text
account required pam_time.so
```

Configure the time restrictions in `/etc/security/time.conf`:

```bash
sudo nano /etc/security/time.conf
```

```text
# Format: services;ttys;users;times
# Allow SSH logins only on weekdays from 8am to 6pm
sshd;*;!root;Al0800-1800
```

The time format uses: `Al` for all days, `Wk` for weekdays, `We` for weekends. Hours are in 24-hour format.

## The common-* Files

Ubuntu uses a set of shared include files to avoid repeating configuration across services:

- `/etc/pam.d/common-auth` - Shared authentication stack
- `/etc/pam.d/common-account` - Shared account management
- `/etc/pam.d/common-password` - Shared password change policy
- `/etc/pam.d/common-session` - Shared session setup

Editing these files affects every service that includes them. That's both powerful and risky - always test changes on a non-critical service first, and keep a root shell open while testing SSH or sudo changes so you can revert if something breaks.

## Debugging PAM Issues

When authentication breaks, the logs are your first stop:

```bash
# Check authentication failures
sudo grep -i "pam\|auth" /var/log/auth.log | tail -50

# Real-time monitoring
sudo tail -f /var/log/auth.log
```

You can also test PAM configurations with the `pamtester` utility:

```bash
# Install pamtester
sudo apt install pamtester

# Test PAM for the sshd service as a specific user
sudo pamtester sshd username authenticate
```

For detailed debugging, temporarily add debug output to a module:

```text
auth required pam_unix.so debug
```

This outputs verbose information to the syslog, which you can read from `/var/log/auth.log`.

## Safety Practices

PAM misconfiguration can lock you out of your own system. Follow these practices:

- Always keep an active root session open when modifying PAM files
- Test changes on a non-critical service before applying to SSH or sudo
- Use `pam_tally2 --reset` or `faillock --reset` to undo lockouts
- Back up PAM files before editing: `sudo cp /etc/pam.d/sshd /etc/pam.d/sshd.bak`
- On cloud instances, use the cloud provider's console as a fallback if SSH breaks

PAM is one of the most powerful and most dangerous configuration areas on Linux. Understanding the module stack and control flags gives you the ability to layer authentication requirements in ways that match your actual security needs.
