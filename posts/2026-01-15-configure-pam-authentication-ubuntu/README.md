# How to Configure PAM Authentication on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, PAM, Authentication, Security, Linux, Tutorial

Description: Complete guide to configuring Pluggable Authentication Modules (PAM) on Ubuntu for flexible authentication policies.

---

Pluggable Authentication Modules (PAM) provide a flexible framework for authenticating users on Linux systems. Instead of hardcoding authentication logic into applications, PAM allows system administrators to configure authentication policies independently from the applications that use them. This guide covers everything you need to know about configuring PAM authentication on Ubuntu, from basic concepts to advanced configurations.

## Understanding PAM Architecture

PAM acts as an intermediary layer between applications and authentication mechanisms. When an application needs to authenticate a user, it makes calls to the PAM library, which then consults configuration files to determine which authentication modules to use and in what order.

### How PAM Works

The PAM architecture consists of four main components:

1. **PAM-aware applications**: Programs that use PAM for authentication (login, su, sudo, ssh, etc.)
2. **PAM library (libpam)**: The core library that applications link against
3. **PAM configuration files**: Located in `/etc/pam.d/`, these define authentication policies
4. **PAM modules**: Shared libraries in `/lib/x86_64-linux-gnu/security/` that perform actual authentication

When a user attempts to log in, the following sequence occurs:

```
User -> Application -> libpam -> Configuration Files -> PAM Modules -> Authentication Backend
```

### Listing Available PAM Modules

To see all installed PAM modules on your Ubuntu system:

```bash
# List all PAM modules
ls -la /lib/x86_64-linux-gnu/security/

# Get information about a specific module
man pam_unix
```

## PAM Configuration Files in /etc/pam.d/

PAM configuration files are located in the `/etc/pam.d/` directory. Each file corresponds to a service or application that uses PAM for authentication.

### Directory Structure

```bash
# View PAM configuration directory
ls -la /etc/pam.d/

# Common files you'll find:
# /etc/pam.d/common-auth     - Common authentication settings
# /etc/pam.d/common-account  - Common account settings
# /etc/pam.d/common-password - Common password settings
# /etc/pam.d/common-session  - Common session settings
# /etc/pam.d/login           - Console login configuration
# /etc/pam.d/sshd            - SSH daemon configuration
# /etc/pam.d/sudo            - Sudo command configuration
# /etc/pam.d/su              - Su command configuration
```

### Configuration File Format

Each line in a PAM configuration file follows this format:

```
type  control  module-path  [module-arguments]
```

Example from `/etc/pam.d/common-auth`:

```bash
# Standard Unix authentication
# type     control    module-path        module-arguments
auth       required   pam_unix.so        nullok
auth       optional   pam_permit.so
```

### Including Other Configuration Files

PAM supports including configurations from other files:

```bash
# Include all settings from common-auth
@include common-auth

# Include only specific type from another file
auth include common-auth
```

## Module Types (auth, account, password, session)

PAM defines four types of modules, each handling a different aspect of the authentication process.

### auth - Authentication Management

The `auth` type verifies the user's identity. This typically involves checking passwords, tokens, or biometric data.

```bash
# /etc/pam.d/common-auth

# Primary authentication via Unix passwords
# The 'nullok' option allows empty passwords (not recommended for production)
auth    [success=1 default=ignore]    pam_unix.so nullok

# Fallback: deny if authentication fails
auth    requisite                     pam_deny.so

# Allow continuation of the stack
auth    required                      pam_permit.so
```

### account - Account Management

The `account` type checks whether the user's account is valid, not expired, and has access during allowed hours.

```bash
# /etc/pam.d/common-account

# Check account validity using Unix account database
# This verifies password expiration, account expiration, etc.
account    [success=1 new_authtok_reqd=done default=ignore]    pam_unix.so

# Deny access if account checks fail
account    requisite    pam_deny.so

# Allow if all checks pass
account    required     pam_permit.so
```

### password - Password Management

The `password` type handles password updates and enforces password policies.

```bash
# /etc/pam.d/common-password

# Enforce password quality requirements
# retry=3: Allow 3 attempts to enter a valid password
password    requisite    pam_pwquality.so retry=3

# Update password in Unix database
# obscure: Check for simple passwords
# use_authtok: Use the password from pam_pwquality
# sha512: Use SHA-512 hashing algorithm
# shadow: Update the shadow password file
password    [success=1 default=ignore]    pam_unix.so obscure use_authtok sha512 shadow

# Deny if password update fails
password    requisite    pam_deny.so

# Allow if all operations succeed
password    required     pam_permit.so
```

### session - Session Management

The `session` type handles tasks that need to occur before and after a user session, such as mounting directories or setting resource limits.

```bash
# /etc/pam.d/common-session

# Set up user session using Unix module
# This handles things like creating the user's home directory
session    [default=1]    pam_permit.so

# Apply user-specific limits from /etc/security/limits.conf
session    required       pam_limits.so

# Standard Unix session setup
session    required       pam_unix.so
```

## Control Flags (required, requisite, sufficient, optional)

Control flags determine how PAM handles the success or failure of each module.

### required

If a `required` module fails, the overall authentication fails, but PAM continues to process remaining modules. This prevents attackers from learning which specific module failed.

```bash
# Both modules must succeed, but both will be tried
auth    required    pam_unix.so
auth    required    pam_shells.so
```

### requisite

If a `requisite` module fails, PAM immediately returns failure without processing remaining modules.

```bash
# If pam_unix fails, stop immediately and don't try pam_ldap
auth    requisite    pam_unix.so
auth    required     pam_ldap.so
```

### sufficient

If a `sufficient` module succeeds (and no prior `required` modules have failed), PAM immediately returns success without processing remaining modules.

```bash
# If pam_unix succeeds, skip LDAP authentication
auth    sufficient    pam_unix.so
auth    required      pam_ldap.so
```

### optional

An `optional` module's result is only considered if it's the only module for that type.

```bash
# pam_motd is nice to have but not essential
session    optional    pam_motd.so
```

### Complex Control Syntax

PAM also supports a more detailed control syntax using brackets:

```bash
# Detailed control: [value1=action1 value2=action2 ...]
# Common values: success, new_authtok_reqd, default
# Common actions: ok, done, die, bad, ignore, reset

# If success, skip next 2 modules; otherwise, ignore this result
auth    [success=2 default=ignore]    pam_unix.so nullok

# If authentication required new token, mark done; on success skip 1
account [success=1 new_authtok_reqd=done default=ignore] pam_unix.so
```

## Common PAM Modules

### pam_unix - Standard Unix Authentication

The foundational module for Unix password authentication.

```bash
# /etc/pam.d/common-auth

# Options explained:
# nullok      - Allow empty passwords (security risk!)
# try_first_pass - Use password from previous module
# use_first_pass - Require password from previous module
# shadow      - Use shadow password file
# sha512      - Use SHA-512 for password hashing

auth    required    pam_unix.so nullok try_first_pass
```

### pam_ldap - LDAP Authentication

Authenticate users against an LDAP directory.

```bash
# Install LDAP PAM module
sudo apt-get install libpam-ldap

# /etc/pam.d/common-auth
# Try local authentication first, fall back to LDAP
auth    sufficient    pam_unix.so nullok try_first_pass
auth    required      pam_ldap.so use_first_pass
```

LDAP configuration in `/etc/ldap.conf`:

```bash
# LDAP server settings
base dc=example,dc=com
uri ldap://ldap.example.com/
ldap_version 3
binddn cn=admin,dc=example,dc=com
bindpw secret
pam_password md5
```

### pam_google_authenticator - Two-Factor Authentication

Enable Google Authenticator TOTP for two-factor authentication.

```bash
# Install Google Authenticator PAM module
sudo apt-get install libpam-google-authenticator

# /etc/pam.d/sshd - Add 2FA to SSH
# Options:
# nullok - Allow users without 2FA configured to still login
auth    required    pam_google_authenticator.so nullok
```

### pam_faillock - Account Lockout

Lock accounts after multiple failed authentication attempts (replaces pam_tally2 in modern systems).

```bash
# /etc/pam.d/common-auth

# Count failed attempts before authentication
# deny=5: Lock after 5 failures
# unlock_time=900: Unlock after 15 minutes (900 seconds)
# fail_interval=900: Count failures within 15 minutes
auth    required    pam_faillock.so preauth deny=5 unlock_time=900 fail_interval=900

# Standard Unix authentication
auth    sufficient  pam_unix.so nullok try_first_pass

# Record failed attempts after authentication
auth    [default=die] pam_faillock.so authfail deny=5 unlock_time=900

# Deny if we reach here
auth    required    pam_deny.so
```

### pam_motd - Message of the Day

Display messages to users upon login.

```bash
# /etc/pam.d/login

# Display message of the day
# motd=/run/motd.dynamic - Dynamic MOTD
# noupdate - Don't update the lastlog
session    optional    pam_motd.so motd=/run/motd.dynamic
session    optional    pam_motd.so noupdate
```

### pam_exec - Execute External Commands

Run external scripts during authentication.

```bash
# /etc/pam.d/common-auth

# Log all authentication attempts to syslog
auth    optional    pam_exec.so /usr/local/bin/auth-logger.sh

# Example script /usr/local/bin/auth-logger.sh:
# #!/bin/bash
# logger -t pam_exec "Authentication attempt for user: $PAM_USER from: $PAM_RHOST"
```

## Password Policies with pam_pwquality

The `pam_pwquality` module (successor to pam_cracklib) enforces strong password policies.

### Installation

```bash
# Install pwquality
sudo apt-get install libpam-pwquality
```

### Basic Configuration

```bash
# /etc/pam.d/common-password

# Enforce password quality
# retry=3       - Allow 3 attempts
# minlen=12     - Minimum password length
# difok=3       - Require 3 characters different from old password
# ucredit=-1    - Require at least 1 uppercase letter
# lcredit=-1    - Require at least 1 lowercase letter
# dcredit=-1    - Require at least 1 digit
# ocredit=-1    - Require at least 1 special character
# reject_username - Don't allow username in password
# enforce_for_root - Apply rules to root as well
password    requisite    pam_pwquality.so retry=3 minlen=12 difok=3 \
                         ucredit=-1 lcredit=-1 dcredit=-1 ocredit=-1 \
                         reject_username enforce_for_root
```

### Advanced Configuration in /etc/security/pwquality.conf

```bash
# /etc/security/pwquality.conf

# Minimum password length (recommended: 12+)
minlen = 14

# Minimum number of character classes (uppercase, lowercase, digit, special)
minclass = 3

# Maximum consecutive characters from same class
maxclassrepeat = 3

# Maximum consecutive identical characters
maxrepeat = 2

# Check against dictionary words
dictcheck = 1

# Dictionary path for password checking
dictpath = /usr/share/dict/words

# Reject passwords containing the username
usercheck = 1

# Reject passwords similar to old password
difok = 5

# Credit values (negative means required)
# -1 = at least one required
# 0 = not required
# positive = bonus credit for each character
ucredit = -1
lcredit = -1
dcredit = -1
ocredit = -1

# Enable for root user
enforce_for_root

# Path for bad passwords list
badwords = password passwd secret admin root
```

### Testing Password Policies

```bash
# Test a password against current policy
echo "testpassword" | pwscore

# Check password quality manually
pwmake 128  # Generate a random password with 128 bits of entropy
```

## Login Restrictions with pam_access and pam_time

### pam_access - Location-Based Access Control

Control who can log in from where.

```bash
# /etc/pam.d/login

# Enable access control
account    required    pam_access.so
```

Configure access rules in `/etc/security/access.conf`:

```bash
# /etc/security/access.conf
# Format: permission : users : origins
# + = allow, - = deny
# users: username, @group, ALL
# origins: hostname, IP, LOCAL, ALL

# Allow root only from local console
+ : root : LOCAL

# Allow admins group from anywhere
+ : @admins : ALL

# Allow developers only from office network
+ : @developers : 192.168.1.0/24

# Allow specific user from specific hosts
+ : john : workstation1.example.com server1.example.com

# Deny everyone else
- : ALL : ALL
```

### pam_time - Time-Based Access Control

Restrict logins to specific times.

```bash
# /etc/pam.d/login

# Enable time-based restrictions
account    required    pam_time.so
```

Configure time rules in `/etc/security/time.conf`:

```bash
# /etc/security/time.conf
# Format: services;ttys;users;times
# services: login, sshd, etc.
# ttys: tty*, pts/*, etc. (use * for all)
# users: username, @group
# times: day/time ranges

# Allow login service on any tty for developers during work hours (Mon-Fri 8am-6pm)
login;*;@developers;Wk0800-1800

# Allow SSH for admins anytime
sshd;*;@admins;Al0000-2400

# Deny login for interns on weekends
login;*;@interns;!Wd0000-2400

# Time format:
# Al = All days
# Wk = Weekdays (Mon-Fri)
# Wd = Weekend (Sat-Sun)
# Mo, Tu, We, Th, Fr, Sa, Su = Specific days
# ! = Negation
```

## Two-Factor Authentication Setup

Setting up two-factor authentication with Google Authenticator for SSH.

### Installation and Initial Setup

```bash
# Install Google Authenticator PAM module
sudo apt-get install libpam-google-authenticator

# Run setup as the user who needs 2FA
google-authenticator

# Answer the prompts:
# - Do you want authentication tokens to be time-based? y
# - Scan the QR code with your authenticator app
# - Enter the verification code to confirm
# - Save emergency scratch codes securely
# - Do you want to disallow multiple uses? y
# - Increase time skew window? n (unless experiencing issues)
# - Enable rate-limiting? y
```

### PAM Configuration for SSH

```bash
# /etc/pam.d/sshd

# IMPORTANT: Order matters! Put Google Auth after @include common-auth
# or before pam_unix depending on your needs

# Option 1: 2FA in addition to password
@include common-auth
auth    required    pam_google_authenticator.so

# Option 2: 2FA OR password (not both)
# auth    sufficient  pam_google_authenticator.so
# auth    sufficient  pam_unix.so
# auth    required    pam_deny.so

# Option 3: Allow users without 2FA to use password only
auth    required    pam_google_authenticator.so nullok
```

### SSH Daemon Configuration

```bash
# /etc/ssh/sshd_config

# Enable challenge-response authentication
ChallengeResponseAuthentication yes

# Enable PAM
UsePAM yes

# For keyboard-interactive authentication (required for 2FA prompts)
AuthenticationMethods keyboard-interactive

# Or require both publickey AND 2FA
# AuthenticationMethods publickey,keyboard-interactive
```

Restart SSH after changes:

```bash
sudo systemctl restart sshd
```

### Advanced Google Authenticator Options

```bash
# /etc/pam.d/sshd

# Full options example:
# nullok              - Allow users without 2FA configured
# secret=/path        - Custom secret file location
# authtok_prompt=     - Custom prompt text
# forward_pass        - Forward password to next module
# noskewadj           - Disable time skew adjustment
# no_increment_hotp   - Don't increment HOTP counter on failed auth
auth    required    pam_google_authenticator.so nullok \
                    secret=/home/${USER}/.google_authenticator \
                    authtok_prompt="Verification code: "
```

## Session Limits with pam_limits

The `pam_limits` module sets resource limits for user sessions.

### Enabling pam_limits

```bash
# /etc/pam.d/common-session

# Apply limits from /etc/security/limits.conf
session    required    pam_limits.so
```

### Configuring Limits

```bash
# /etc/security/limits.conf
# Format: domain  type  item  value
# domain: username, @group, *, (wildcard)
# type: soft, hard, - (both)
# item: various resource limits

# ============================================
# Process Limits
# ============================================

# Maximum number of processes for regular users
*               soft    nproc           4096
*               hard    nproc           8192

# Unlimited processes for admins
@admins         -       nproc           unlimited

# ============================================
# File Descriptor Limits
# ============================================

# Maximum open files for all users
*               soft    nofile          4096
*               hard    nofile          65536

# Higher limits for web server user
www-data        soft    nofile          65536
www-data        hard    nofile          65536

# ============================================
# Memory Limits
# ============================================

# Maximum locked memory (in KB)
*               soft    memlock         64
*               hard    memlock         64

# Unlimited for database user
postgres        -       memlock         unlimited

# Maximum virtual memory (in KB)
@students       hard    as              4194304    # 4GB

# ============================================
# CPU Limits
# ============================================

# Maximum CPU time (in minutes)
@batch          hard    cpu             60

# Nice priority limits (-20 highest to 19 lowest)
*               soft    priority        0
@admins         soft    priority        -5

# ============================================
# Core Dump Limits
# ============================================

# Disable core dumps for security
*               hard    core            0

# Allow core dumps for developers (in KB)
@developers     soft    core            unlimited

# ============================================
# Login Limits
# ============================================

# Maximum concurrent logins
*               hard    maxlogins       10
@students       hard    maxlogins       2

# Maximum concurrent logins for same user from same source
*               hard    maxsyslogins    100
```

### Per-Directory Limits

```bash
# /etc/security/limits.d/90-custom.conf
# Files in limits.d are processed after limits.conf

# Application-specific limits
app-user        -       nofile          100000
app-user        -       nproc           unlimited
```

### Verifying Limits

```bash
# Check current limits for your session
ulimit -a

# Check specific limit
ulimit -n    # Open files
ulimit -u    # Processes

# Check limits for another user (as root)
su - username -c "ulimit -a"
```

## PAM Debugging and Troubleshooting

### Enable PAM Debug Logging

```bash
# Add debug option to any PAM module
auth    required    pam_unix.so debug

# View debug output in syslog
sudo tail -f /var/log/auth.log
```

### Using pamtester

```bash
# Install pamtester
sudo apt-get install pamtester

# Test PAM configuration for a service
# Syntax: pamtester service username operation
pamtester login testuser authenticate

# Test with verbose output
pamtester -v login testuser authenticate

# Test account validation
pamtester login testuser acct_mgmt

# Test password change
pamtester login testuser chauthtok
```

### Common Troubleshooting Commands

```bash
# Check PAM configuration syntax
# PAM doesn't have a built-in validator, but you can check for common issues

# Verify module exists
ls -la /lib/x86_64-linux-gnu/security/pam_unix.so

# Check module dependencies
ldd /lib/x86_64-linux-gnu/security/pam_unix.so

# View authentication logs
sudo tail -f /var/log/auth.log

# Check for SELinux/AppArmor issues
sudo aa-status    # AppArmor
getenforce        # SELinux

# Test SSH PAM configuration specifically
sudo sshd -t      # Test SSH config syntax
sudo sshd -T      # Show effective configuration
```

### Debugging pam_faillock

```bash
# Check failed login attempts for a user
faillock --user username

# Reset failed attempts counter
sudo faillock --user username --reset

# View all users with failed attempts
sudo faillock
```

### Recovery from PAM Misconfiguration

If you lock yourself out due to PAM misconfiguration:

```bash
# Boot into recovery mode or use live USB

# Mount root filesystem
mount /dev/sda1 /mnt

# Edit PAM configuration
nano /mnt/etc/pam.d/common-auth

# Or restore from backup
cp /mnt/etc/pam.d/common-auth.bak /mnt/etc/pam.d/common-auth
```

### Creating PAM Configuration Backups

```bash
# Always backup before making changes
sudo cp -r /etc/pam.d /etc/pam.d.backup.$(date +%Y%m%d)
sudo cp /etc/security/limits.conf /etc/security/limits.conf.backup.$(date +%Y%m%d)
sudo cp /etc/security/access.conf /etc/security/access.conf.backup.$(date +%Y%m%d)
```

## Security Best Practices

### 1. Follow the Principle of Least Privilege

```bash
# /etc/security/access.conf

# Default deny, explicitly allow
+ : root : LOCAL
+ : @admins : ALL
- : ALL : ALL
```

### 2. Implement Strong Password Policies

```bash
# /etc/security/pwquality.conf

# Enforce strong passwords
minlen = 14
minclass = 3
maxrepeat = 2
dictcheck = 1
usercheck = 1
enforce_for_root
```

### 3. Enable Account Lockout

```bash
# /etc/pam.d/common-auth

# Lock accounts after failed attempts
auth    required    pam_faillock.so preauth deny=5 unlock_time=1800 fail_interval=900
auth    sufficient  pam_unix.so nullok try_first_pass
auth    [default=die] pam_faillock.so authfail
auth    required    pam_deny.so
```

### 4. Use Two-Factor Authentication

```bash
# /etc/pam.d/sshd

# Require 2FA for SSH
auth    required    pam_google_authenticator.so
```

### 5. Restrict Root Access

```bash
# /etc/pam.d/su

# Only allow users in wheel group to use su
auth    required    pam_wheel.so use_uid group=wheel
```

### 6. Set Session Timeouts

```bash
# /etc/profile.d/timeout.sh
# Auto-logout inactive sessions

export TMOUT=900    # 15 minutes
readonly TMOUT
```

### 7. Limit Resources

```bash
# /etc/security/limits.conf

# Prevent fork bombs
*    hard    nproc    256

# Limit core dumps
*    hard    core     0
```

### 8. Audit Authentication Events

```bash
# /etc/pam.d/common-auth

# Log all authentication attempts
auth    required    pam_exec.so quiet /usr/local/bin/audit-auth.sh
```

Example audit script:

```bash
#!/bin/bash
# /usr/local/bin/audit-auth.sh

logger -p auth.info -t pam_audit \
    "Auth: user=$PAM_USER service=$PAM_SERVICE tty=$PAM_TTY rhost=$PAM_RHOST type=$PAM_TYPE"
```

### 9. Regular Security Audits

```bash
#!/bin/bash
# pam-audit.sh - Audit PAM configuration

echo "=== PAM Configuration Audit ==="

# Check for nullok (allows empty passwords)
echo -e "\n[WARNING] Files with 'nullok' (allows empty passwords):"
grep -r "nullok" /etc/pam.d/ 2>/dev/null

# Check for missing required modules
echo -e "\n[INFO] Authentication stack:"
cat /etc/pam.d/common-auth

# Check password policies
echo -e "\n[INFO] Password quality settings:"
cat /etc/security/pwquality.conf 2>/dev/null

# Check access restrictions
echo -e "\n[INFO] Access restrictions:"
cat /etc/security/access.conf 2>/dev/null | grep -v "^#" | grep -v "^$"

# Check limits
echo -e "\n[INFO] Resource limits:"
cat /etc/security/limits.conf 2>/dev/null | grep -v "^#" | grep -v "^$"
```

### 10. Keep Modules Updated

```bash
# Update PAM-related packages
sudo apt-get update
sudo apt-get upgrade libpam-modules libpam-runtime

# Check for security updates
sudo apt-get changelog libpam-modules | head -50
```

## Complete Configuration Examples

### Secure SSH Configuration

```bash
# /etc/pam.d/sshd

# PAM configuration for SSH with enhanced security
# Last modified: 2026-01-15

# ============================================
# Authentication Stack
# ============================================

# Prevent root SSH login via PAM (in addition to sshd_config)
auth    required      pam_securetty.so

# Account lockout protection - preauth phase
# deny=5: Lock after 5 failures
# unlock_time=1800: Auto-unlock after 30 minutes
# fail_interval=900: Count failures within 15 minutes window
auth    required      pam_faillock.so preauth \
                      deny=5 unlock_time=1800 fail_interval=900

# Standard Unix authentication
auth    sufficient    pam_unix.so nullok try_first_pass

# Two-factor authentication with Google Authenticator
# nullok: Allow users who haven't set up 2FA (remove in production)
auth    required      pam_google_authenticator.so nullok

# Record failed attempts - authfail phase
auth    [default=die] pam_faillock.so authfail

# Final deny for failed authentication
auth    required      pam_deny.so

# ============================================
# Account Stack
# ============================================

# Check account validity
account    required      pam_nologin.so

# Time-based access control
account    required      pam_time.so

# Location-based access control
account    required      pam_access.so

# Standard account checks
account    required      pam_unix.so

# ============================================
# Session Stack
# ============================================

# Set up session
session    required      pam_loginuid.so

# Apply resource limits
session    required      pam_limits.so

# Print last login information
session    optional      pam_lastlog.so showfailed

# Standard session setup
session    required      pam_unix.so

# Print message of the day
session    optional      pam_motd.so noupdate
```

### Secure Login Configuration

```bash
# /etc/pam.d/login

# PAM configuration for console login
# Last modified: 2026-01-15

# ============================================
# Authentication Stack
# ============================================

# Only allow root on secure terminals
auth    requisite     pam_securetty.so

# Account lockout
auth    required      pam_faillock.so preauth deny=5 unlock_time=1800

# Delay after failed auth (2 seconds)
auth    optional      pam_faildelay.so delay=2000000

# Standard Unix authentication
auth    sufficient    pam_unix.so nullok try_first_pass

# Record failures
auth    [default=die] pam_faillock.so authfail

auth    required      pam_deny.so

# ============================================
# Account Stack
# ============================================

# Check for nologin file
account    required      pam_nologin.so

# Time restrictions
account    required      pam_time.so

# Access restrictions
account    required      pam_access.so

# Standard account verification
account    required      pam_unix.so

# ============================================
# Password Stack
# ============================================

# Password quality enforcement
password    requisite     pam_pwquality.so retry=3 minlen=12 \
                          ucredit=-1 lcredit=-1 dcredit=-1 ocredit=-1

# Update password
password    required      pam_unix.so use_authtok sha512 shadow

# ============================================
# Session Stack
# ============================================

# Resource limits
session    required      pam_limits.so

# Environment setup
session    required      pam_env.so

# Mail notification
session    optional      pam_mail.so standard

# Last login
session    optional      pam_lastlog.so

# MOTD
session    optional      pam_motd.so

# Standard session
session    required      pam_unix.so
```

### Secure sudo Configuration

```bash
# /etc/pam.d/sudo

# PAM configuration for sudo
# Last modified: 2026-01-15

# ============================================
# Authentication
# ============================================

# Require wheel group membership for sudo
auth    required      pam_wheel.so use_uid group=sudo

# Standard authentication
auth    sufficient    pam_unix.so try_first_pass

# Require 2FA for sudo (optional, can be intrusive)
# auth    required      pam_google_authenticator.so

auth    required      pam_deny.so

# ============================================
# Account
# ============================================

account    required      pam_unix.so

# ============================================
# Session
# ============================================

# Log sudo session
session    required      pam_limits.so
session    required      pam_unix.so
```

## Monitoring PAM with OneUptime

While proper PAM configuration is essential for securing your Ubuntu systems, monitoring authentication events is equally important. Authentication failures, unusual login patterns, and account lockouts can indicate security incidents that require immediate attention.

**OneUptime** provides comprehensive monitoring capabilities that can help you track PAM-related security events:

- **Log Monitoring**: Aggregate and analyze authentication logs from `/var/log/auth.log` across all your servers to detect suspicious patterns
- **Alert Management**: Set up alerts for multiple failed login attempts, account lockouts, or logins from unusual locations
- **Security Dashboards**: Visualize authentication trends and identify potential brute-force attacks in real-time
- **Incident Response**: Automatically create incidents when security thresholds are exceeded, ensuring rapid response to potential breaches

By combining robust PAM authentication configuration with OneUptime's monitoring capabilities, you can maintain a strong security posture while ensuring quick detection and response to potential threats. Visit [https://oneuptime.com](https://oneuptime.com) to learn more about securing and monitoring your infrastructure.
