# How to Configure authselect Profiles for PAM and NSS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Authselect, PAM, NSS, Linux

Description: A practical guide to using authselect on RHEL to manage PAM and NSS configurations, covering built-in profiles, features, custom profiles, and migration from authconfig.

---

authselect is the tool RHEL uses to manage PAM (Pluggable Authentication Modules) and NSS (Name Service Switch) configurations. It replaced authconfig starting with RHEL 8. Instead of manually editing PAM files (which is error-prone and hard to maintain), authselect lets you select a profile and enable features. It generates the correct PAM and NSS configuration files for you.

## Why authselect Exists

```mermaid
flowchart TD
    A[authselect] -->|Generates| B[/etc/pam.d/system-auth]
    A -->|Generates| C[/etc/pam.d/password-auth]
    A -->|Generates| D[/etc/pam.d/fingerprint-auth]
    A -->|Generates| E[/etc/pam.d/smartcard-auth]
    A -->|Generates| F[/etc/pam.d/postlogin]
    A -->|Generates| G[/etc/nsswitch.conf]
```

Manually editing PAM files is risky. One typo can lock everyone out of the system. authselect manages these files through tested, validated profiles, and tracks which profile is active so you can always see and revert the configuration.

## Built-in Profiles

RHEL ships with three built-in profiles:

```bash
# List available profiles
authselect list
```

| Profile | Use Case |
|---------|----------|
| sssd | Systems using SSSD for authentication (IdM, AD, LDAP) |
| winbind | Systems using Samba Winbind for AD integration |
| minimal | Minimal PAM configuration, local authentication only |

## Step 1 - Check the Current Configuration

```bash
# Show the current authselect profile and features
authselect current

# Show which files authselect manages
authselect check
```

If `authselect check` reports issues, the PAM files may have been manually edited. authselect will warn you about this.

## Step 2 - Select a Profile

### SSSD Profile (Most Common)

```bash
# Select the SSSD profile
sudo authselect select sssd

# Select with a feature enabled
sudo authselect select sssd with-mkhomedir

# Force selection if files were manually modified
sudo authselect select sssd --force
```

### Winbind Profile

```bash
# Select the Winbind profile for Samba AD integration
sudo authselect select winbind with-mkhomedir
```

### Minimal Profile

```bash
# Select the minimal profile (local auth only)
sudo authselect select minimal
```

## Step 3 - Enable and Disable Features

Features modify the selected profile without changing the base profile.

```bash
# List available features for the current profile
authselect list-features sssd
```

Common features:

| Feature | Purpose |
|---------|---------|
| with-mkhomedir | Auto-create home directories on first login |
| with-faillock | Enable account lockout after failed attempts |
| with-smartcard | Enable smart card authentication |
| with-smartcard-required | Require smart card (no password fallback) |
| with-fingerprint | Enable fingerprint authentication |
| with-sudo | Enable SSSD-provided sudo rules |
| with-pamaccess | Enable /etc/security/access.conf restrictions |
| with-silent-lastlog | Suppress last login messages |

### Enable a Feature

```bash
# Enable automatic home directory creation
sudo authselect enable-feature with-mkhomedir

# Enable account lockout
sudo authselect enable-feature with-faillock

# Enable multiple features at once
sudo authselect select sssd with-mkhomedir with-faillock with-sudo
```

### Disable a Feature

```bash
# Disable a specific feature
sudo authselect disable-feature with-fingerprint
```

## Step 4 - Configure faillock (Account Lockout)

When you enable the `with-faillock` feature, configure the lockout parameters.

```bash
# Enable faillock
sudo authselect enable-feature with-faillock

# Configure lockout settings
sudo vi /etc/security/faillock.conf
```

```ini
# Lock account after 5 failed attempts
deny = 5

# Unlock after 15 minutes (900 seconds)
unlock_time = 900

# Count failures within this window (15 minutes)
fail_interval = 900

# Even lock root (be careful with this)
even_deny_root = false
root_unlock_time = 60
```

Test the configuration:

```bash
# Check lockout status for a user
faillock --user jsmith

# Reset a locked account
sudo faillock --user jsmith --reset
```

## Step 5 - Configure PAM Access Control

The `with-pamaccess` feature enables `/etc/security/access.conf` for login restrictions.

```bash
# Enable PAM access control
sudo authselect enable-feature with-pamaccess

# Edit access rules
sudo vi /etc/security/access.conf
```

Example rules:

```bash
# Allow the admins group from anywhere
+ : admins : ALL

# Allow local console logins for all users
+ : ALL : LOCAL

# Allow specific users from specific networks
+ : jsmith : 10.0.0.0/24

# Deny everyone else
- : ALL : ALL
```

## Step 6 - Create a Custom Profile

If the built-in profiles do not meet your needs, create a custom profile.

```bash
# Create a custom profile based on the SSSD profile
sudo authselect create-profile my-company --base-on sssd

# Custom profiles are stored here
ls /etc/authselect/custom/my-company/
```

Edit the custom profile files:

```bash
# Edit the system-auth PAM file
sudo vi /etc/authselect/custom/my-company/system-auth

# Edit the nsswitch.conf template
sudo vi /etc/authselect/custom/my-company/nsswitch.conf
```

Select your custom profile:

```bash
# Use the custom profile
sudo authselect select custom/my-company with-mkhomedir
```

## Step 7 - Understanding the NSS Configuration

authselect also manages `/etc/nsswitch.conf`, which controls where the system looks up users, groups, hosts, and other data.

```bash
# View the current NSS configuration
cat /etc/nsswitch.conf
```

With the SSSD profile, the relevant lines look like:

```bash
passwd:     sss files
group:      sss files
shadow:     files sss
hosts:      files dns myhostname
```

This means the system checks SSSD first for user and group lookups, then falls back to local files.

## Migrating from authconfig

If you are upgrading from RHEL 7 where authconfig was used:

```bash
# Check if authconfig was used previously
ls /etc/sysconfig/authconfig 2>/dev/null

# authselect can detect and migrate the old configuration
sudo authselect check

# Apply the appropriate authselect profile
sudo authselect select sssd with-mkhomedir --force
```

## Troubleshooting

### Locked Out After authselect Change

If you get locked out after a profile change, boot into single-user mode or use a rescue disk:

```bash
# Reset to minimal profile (allows local login)
sudo authselect select minimal --force
```

### PAM Files Modified Externally

```bash
# Check for manual modifications
authselect check

# If modifications exist, either:
# 1. Reapply the profile (overwrites manual changes)
sudo authselect apply-changes

# 2. Or use --force to select the profile again
sudo authselect select sssd --force
```

### Feature Not Working

```bash
# Verify the feature is enabled
authselect current

# Check the generated PAM files
cat /etc/pam.d/system-auth | grep -v "^#"
```

authselect is a simple tool that manages a complex subsystem. Learn it once, use the right profile with the right features, and you will never have to hand-edit PAM files again. That alone is worth the five minutes it takes to understand.
