# How to Use authselect to Manage PAM Profiles on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, authselect, PAM, Linux

Description: Learn how to use authselect on RHEL to manage PAM profiles safely, enable features like faillock and fingerprint auth, and create custom profiles.

---

On older RHEL versions, managing PAM meant editing configuration files by hand and hoping you did not break authentication for the entire system. RHEL replaces that approach with authselect, a tool that manages PAM and nsswitch.conf profiles as coherent units. This is the right way to manage authentication configuration on RHEL.

## Why authselect Exists

Directly editing files in `/etc/pam.d/` is fragile. One typo in `/etc/pam.d/system-auth` can lock out every user on the box. authselect provides pre-tested profiles and lets you toggle features on and off without manually editing PAM stacks.

```mermaid
graph LR
    A[authselect] --> B[/etc/pam.d/system-auth]
    A --> C[/etc/pam.d/password-auth]
    A --> D[/etc/pam.d/fingerprint-auth]
    A --> E[/etc/pam.d/smartcard-auth]
    A --> F[/etc/pam.d/postlogin]
    A --> G[/etc/nsswitch.conf]
```

## Checking the Current Profile

```bash
# See which authselect profile is currently active
sudo authselect current
```

Typical output:

```bash
Profile ID: sssd
Enabled features:
- with-faillock
- with-silent-lastlog
```

## Available Profiles

RHEL ships with three built-in profiles:

```bash
# List all available profiles
sudo authselect list
```

| Profile | Use Case |
|---|---|
| sssd | Systems using SSSD for identity (LDAP, AD, IPA) |
| winbind | Systems using Samba Winbind for AD integration |
| minimal | Bare-bones local authentication only |

## Selecting a Profile

### Switch to the sssd profile

```bash
# Apply the sssd profile
sudo authselect select sssd

# If PAM files were manually modified, force the switch
sudo authselect select sssd --force
```

The `--force` flag overwrites any manual changes to PAM files. Use it carefully.

### Switch to minimal for standalone systems

```bash
sudo authselect select minimal --force
```

## Enabling and Disabling Features

Features are add-ons that modify the selected profile. They toggle specific PAM modules on or off.

### List available features for the current profile

```bash
sudo authselect list-features sssd
```

Common features include:

| Feature | What It Does |
|---|---|
| with-faillock | Enables account lockout after failed logins |
| with-mkhomedir | Auto-creates home directories for LDAP/AD users |
| with-fingerprint | Enables fingerprint authentication |
| with-smartcard | Enables smart card authentication |
| with-smartcard-required | Requires smart card auth |
| with-silent-lastlog | Suppresses last login message |
| with-pamaccess | Enables /etc/security/access.conf checks |
| with-ecryptfs | Enables encrypted home directories |

### Enable a feature

```bash
# Enable account lockout
sudo authselect enable-feature with-faillock

# Enable automatic home directory creation
sudo authselect enable-feature with-mkhomedir
```

### Disable a feature

```bash
# Disable faillock
sudo authselect disable-feature with-faillock
```

### Enable multiple features at once during profile selection

```bash
sudo authselect select sssd with-faillock with-mkhomedir with-pamaccess --force
```

## Creating Custom Profiles

When the built-in profiles do not meet your needs, create a custom one.

### Create a custom profile based on sssd

```bash
# Create the custom profile
sudo authselect create-profile myorg --base-on sssd
```

This creates template files in `/etc/authselect/custom/myorg/`.

### Edit the custom profile templates

```bash
# List the files in your custom profile
ls /etc/authselect/custom/myorg/
```

You will see files like `system-auth`, `password-auth`, `postlogin`, and `nsswitch.conf`. Edit them as needed:

```bash
sudo vi /etc/authselect/custom/myorg/system-auth
```

The template files use conditional markers for features. For example:

```bash
{if "with-faillock":auth    required    pam_faillock.so preauth silent deny=5 unlock_time=900}
auth        required      pam_unix.so {if not "without-nullok":nullok} try_first_pass
{if "with-faillock":auth    required    pam_faillock.so authfail deny=5 unlock_time=900}
```

The `{if "feature-name":...}` syntax means that line is only included when the feature is enabled.

### Apply the custom profile

```bash
sudo authselect select custom/myorg --force

# Enable features on your custom profile
sudo authselect select custom/myorg with-faillock --force
```

## Checking Configuration Integrity

authselect can verify that nobody has manually edited the managed PAM files:

```bash
# Check if managed files match the expected profile
sudo authselect check
```

If files have been modified outside of authselect, you will see warnings. To fix them:

```bash
# Restore files to match the current profile
sudo authselect apply-changes
```

## Backing Up and Restoring

Before making changes, create a backup:

```bash
# Back up the current authentication configuration
sudo authselect backup my-backup-$(date +%Y%m%d)

# List available backups
sudo authselect backup-list

# Restore from a backup
sudo authselect backup-restore my-backup-20260304
```

## Practical Example: Setting Up AD-Joined Workstation

Here is a typical workflow for a workstation joined to Active Directory via SSSD:

```bash
# Install required packages
sudo dnf install sssd sssd-ad realmd oddjob oddjob-mkhomedir -y

# Join the domain
sudo realm join ad.example.com

# Configure authselect with the right features
sudo authselect select sssd with-mkhomedir with-faillock with-pamaccess --force

# Verify the configuration
sudo authselect current
sudo authselect check
```

## Migrating from authconfig

If you are migrating from RHEL 7 or 8 systems that used the older authconfig tool:

```bash
# Check if there is an authconfig-compatible layer
rpm -q authselect-compat
```

The `authselect-compat` package provides wrapper scripts that translate old authconfig commands to authselect. However, it is better to learn authselect directly rather than relying on the compatibility layer.

## Troubleshooting

### PAM files were manually edited

```bash
# Check for modifications
sudo authselect check

# If the output shows modified files, and you want to revert
sudo authselect apply-changes
```

### Features are not taking effect

```bash
# Verify the feature is listed as enabled
sudo authselect current

# Re-apply the profile with features
sudo authselect select sssd with-faillock --force
```

### Authentication is broken after a change

If you still have root access (via a console session, for example):

```bash
# Switch back to a known-good minimal profile
sudo authselect select minimal --force

# Or restore from backup
sudo authselect backup-restore my-backup-20260304
```

## Wrapping Up

authselect is the standard way to manage PAM on RHEL. It eliminates the risk of manually editing PAM files and gives you a repeatable, auditable configuration. Use the built-in profiles for most setups, enable features as needed, and create custom profiles only when the defaults truly do not fit. Always keep a backup before making changes, and keep a root shell open when testing new configurations.
