# How to Fix 'Permission Denied (publickey)' SSH Error on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSH, Troubleshooting, Authentication, Public Key

Description: Diagnose and fix the 'Permission denied (publickey)' SSH error on RHEL by checking key configuration, file permissions, and SSH daemon settings.

---

The "Permission denied (publickey)" error means SSH key-based authentication failed. This guide walks through the most common causes and fixes.

## Diagnosing the Issue

```bash
# Connect with verbose output to see exactly where authentication fails
ssh -vvv user@server.example.com 2>&1 | grep -A5 "Offering public key\|Permission denied"

# Key things to look for in verbose output:
# - "Offering public key" shows which keys are being tried
# - "Server refused our key" means the server rejected the key
```

## Check Client-Side Issues

```bash
# Verify your private key exists and has correct permissions
ls -la ~/.ssh/id_rsa
# Should be: -rw------- (600)

# Fix private key permissions if wrong
chmod 600 ~/.ssh/id_rsa

# Verify the .ssh directory permissions
ls -ld ~/.ssh/
# Should be: drwx------ (700)
chmod 700 ~/.ssh/

# Ensure the correct key is being offered
ssh -i ~/.ssh/id_rsa user@server.example.com
```

## Check Server-Side Issues

On the remote server:

```bash
# Verify the authorized_keys file exists and has the correct public key
cat ~/.ssh/authorized_keys

# Check authorized_keys permissions
ls -la ~/.ssh/authorized_keys
# Should be: -rw------- (600) or -rw-r--r-- (644)
chmod 600 ~/.ssh/authorized_keys

# Check .ssh directory permissions
chmod 700 ~/.ssh

# Check home directory permissions (must not be writable by others)
chmod 755 ~
```

## Check SSH Daemon Configuration

```bash
# View the SSH daemon configuration
sudo grep -E "PubkeyAuthentication|AuthorizedKeysFile|PermitRootLogin" /etc/ssh/sshd_config

# Ensure public key authentication is enabled
# PubkeyAuthentication yes
# AuthorizedKeysFile .ssh/authorized_keys

# If you changed the config, restart sshd
sudo systemctl restart sshd
```

## Check SELinux Contexts

SELinux can block SSH from reading authorized_keys if the context is wrong.

```bash
# Check SELinux context on the .ssh directory and authorized_keys
ls -Z ~/.ssh/
ls -Z ~/.ssh/authorized_keys

# The correct context is ssh_home_t
# Restore the proper context
sudo restorecon -Rv ~/.ssh/
```

## Check for Home Directory Issues

```bash
# If using a network home directory or non-standard path
# Verify the user's home directory
getent passwd username

# Check if StrictModes is causing issues
sudo grep StrictModes /etc/ssh/sshd_config
# StrictModes yes (default) - enforces permission checks
```

The most common cause is incorrect file permissions on the server side. Start by fixing permissions on `~/.ssh/` (700) and `~/.ssh/authorized_keys` (600).
