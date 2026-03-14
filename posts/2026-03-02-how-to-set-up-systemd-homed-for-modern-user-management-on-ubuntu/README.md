# How to Set Up systemd-homed for Modern User Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, User Management, Security, Systemd-homed

Description: Configure systemd-homed on Ubuntu for portable, encrypted home directories with per-user resource limits and modern authentication features.

---

`systemd-homed` is a relatively new component of the systemd suite that reimagines how user accounts and home directories are managed. Instead of the traditional `/etc/passwd` + `/home/username` model, homed manages user records and home directories as self-contained units that can be encrypted, resource-limited, and even portable across machines. It's particularly useful for workstations, shared systems, and environments where per-user disk encryption matters.

## What systemd-homed Provides

Traditional Linux user management splits account information across `/etc/passwd`, `/etc/shadow`, `/etc/group`, and `/home/`. systemd-homed:

- Stores user records as JSON in `/var/lib/systemd/home/`
- Optionally encrypts home directories (LUKS-based)
- Supports portable home directories (LUKS image files you can move between machines)
- Enforces per-user resource limits (disk quota, CPU, memory)
- Requires passwords to be provided at login (not stored in kernel keyrings by default)
- Supports FIDO2 hardware tokens and TPM-based unlock

## Prerequisites

```bash
# Check systemd version (homed requires systemd 245+)
systemctl --version

# Install systemd-homed
sudo apt update
sudo apt install systemd-homed

# Enable and start the service
sudo systemctl enable --now systemd-homed

# Verify it's running
sudo systemctl status systemd-homed
```

Also install the PAM module to integrate homed with login:

```bash
# Check if pam_systemd_home is installed
dpkg -l | grep libpam-systemd
# If not present, it may be part of another package
dpkg -l | grep systemd | grep lib
```

## Understanding homed User Records

Each homed user has a JSON record stored at `/var/lib/systemd/home/username.identity`. These records contain all user information: UID, groups, shell, password hash, resource limits, and more.

```bash
# List all homed-managed users
homectl list

# Show a user's record
homectl inspect username
```

## Creating a homed User

```bash
# Create a basic homed user
sudo homectl create alice

# Create with specific settings
sudo homectl create bob \
    --shell=/bin/bash \
    --member-of=sudo \
    --storage=luks \
    --disk-size=20G

# Create with a FIDO2 token
sudo homectl create carol \
    --storage=luks \
    --fido2-device=auto
```

Storage types:
- `luks` - Encrypted LUKS volume (best for security)
- `directory` - Plain directory (like traditional `/home/username`)
- `subvolume` - Btrfs subvolume
- `fscrypt` - fscrypt-encrypted directory (requires kernel support)
- `cifs` - CIFS/SMB network share

## Setting a Password

When you create a user, you'll be prompted to set a password. To change it later:

```bash
# Change the password for a user
sudo homectl passwd alice

# Authenticate and change your own password
homectl passwd
```

## Activating and Deactivating Home Directories

homed home directories are not always mounted. They're activated at login and deactivated when the user logs out:

```bash
# Activate (mount/unlock) a home directory
sudo homectl activate alice

# Deactivate (unmount/lock)
sudo homectl deactivate alice

# Check which home directories are active
homectl list | grep -i active
```

For LUKS-backed homes, activation decrypts the LUKS volume and mounts it. Deactivation unmounts and re-encrypts.

## Resource Limits per User

One of homed's key features is per-user resource control:

```bash
# Set disk size limit
sudo homectl update alice --disk-size=50G

# Set memory limit
sudo homectl update alice --memory-max=4G

# Set CPU weight (relative to other users)
sudo homectl update alice --cpu-weight=100

# Set task/process limit
sudo homectl update alice --tasks-max=500

# Set I/O weight
sudo homectl update alice --io-weight=100

# Combine multiple limits
sudo homectl update bob \
    --disk-size=20G \
    --memory-max=2G \
    --cpu-weight=50 \
    --tasks-max=200
```

## Inspecting User Records

```bash
# Show full JSON record for a user
homectl inspect alice

# Show a simplified summary
homectl inspect --json=short alice

# Example output:
# {
#   "userName": "alice",
#   "uid": 1001,
#   "gid": 1001,
#   "realName": "Alice",
#   "homeDirectory": "/home/alice",
#   "shell": "/bin/bash",
#   "storage": "luks",
#   "diskSize": 53687091200,
#   "memberOf": ["sudo"]
# }
```

## Portable Home Directories

With LUKS storage, the home directory is an image file in `/var/lib/systemd/home/alice.home`. This file can be moved to another machine:

```bash
# List homed image files
ls -lh /var/lib/systemd/home/*.home 2>/dev/null

# On the source machine - prepare for portability
sudo homectl deactivate alice
# Copy alice.home and alice.identity to the target machine

# On the target machine - import the home
sudo homectl adopt /path/to/alice.home

# Activate on the new machine (requires alice's password)
sudo homectl activate alice
```

## PAM Integration

For homed users to log in via SSH, sudo, or TTY, the PAM stack needs to include `pam_systemd_home`:

Check `/etc/pam.d/common-auth`:

```bash
grep pam_systemd_home /etc/pam.d/common-auth
```

If not present, add it:

```bash
sudo nano /etc/pam.d/common-auth
```

```text
# Existing auth rules...
# Add before or after existing lines:
auth    sufficient  pam_unix.so
auth    sufficient  pam_systemd_home.so

# In common-session:
session optional    pam_systemd_home.so
```

The exact configuration depends on your PAM setup. The `pam_systemd_home` module handles activation of the home directory when the user authenticates.

## SSH Access with homed Users

For SSH access, homed users work like regular users once their home directory is active. The key requirement is that the home is activated before SSH tries to access it. Configure SSH's PAM stack:

```bash
grep pam_systemd_home /etc/pam.d/sshd
```

A minimal `/etc/pam.d/sshd` with homed support:

```text
# Standard authentication
@include common-auth

# Account
@include common-account

# Session
@include common-session

# homed activation at login
session required pam_systemd_home.so
```

## Using FIDO2 Hardware Tokens

homed supports FIDO2 hardware security keys for home directory unlock:

```bash
# Enroll a FIDO2 token for an existing user
sudo homectl update alice --fido2-device=auto

# The user's password is still the fallback
# On login, the FIDO2 token is checked first

# Remove FIDO2 enrollment
sudo homectl update alice --fido2-device=
```

## Removing a homed User

```bash
# Remove a user and their home directory
sudo homectl remove alice

# Remove just the user record, keep the home directory
# (Useful before moving the home to another machine)
sudo homectl remove --keep-home alice
```

## Troubleshooting

**Home directory fails to activate** - Check the homed journal:

```bash
journalctl -u systemd-homed -f

# Common issue: LUKS image file missing or corrupted
ls -lh /var/lib/systemd/home/alice.home
```

**User can't log in** - Check PAM configuration:

```bash
# Test PAM authentication
sudo su - alice

# Check PAM logs
journalctl | grep pam

# Check if homed thinks the user is valid
homectl inspect alice
```

**Disk space issues** - LUKS images are pre-allocated to their maximum size:

```bash
# Check how much space is used inside the home
sudo homectl inspect alice | grep -i disk

# Resize the home directory
sudo homectl update alice --disk-size=100G
```

## Limitations to Be Aware Of

homed is relatively new and has some known limitations:

1. **NFS home directories**: homed doesn't support NFS-backed homes natively.
2. **Traditional tools**: Some tools that directly read `/etc/passwd` may not handle homed users correctly since UIDs are dynamically assigned.
3. **Container compatibility**: homed inside containers requires additional configuration.
4. **Recovery**: LUKS-encrypted homes need the password to recover. Store recovery keys in a secure location.

systemd-homed represents a significant improvement over traditional user management for scenarios where per-user encryption and resource isolation matter. It works best on single-user workstations, shared physical servers, or systems that need to comply with requirements for data encryption at rest.
