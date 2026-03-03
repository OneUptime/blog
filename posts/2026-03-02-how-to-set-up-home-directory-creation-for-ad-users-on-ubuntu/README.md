# How to Set Up Home Directory Creation for AD Users on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Active Directory, SSSD, PAM, Home Directory

Description: Configure automatic home directory creation for Active Directory users logging into Ubuntu with pam_mkhomedir and oddjob, with custom templates and permissions.

---

When an Active Directory user logs into Ubuntu for the first time, their home directory does not exist by default. Without it, the login either fails or drops the user into `/` with no personal space. Configuring automatic home directory creation is an essential step when joining Ubuntu to Active Directory.

There are two approaches: using `pam_mkhomedir.so` directly in the PAM stack, or using `oddjob`/`oddjobd` for creation with elevated privileges. This guide covers both.

## Prerequisites

- Ubuntu 22.04 or 24.04 joined to Active Directory (via `realm join`)
- SSSD configured and working (AD users visible via `id username`)
- Root/sudo access

## Method 1: pam_mkhomedir (Simpler, Recommended)

`pam_mkhomedir.so` is a PAM module that creates home directories on first login. It runs in the session phase, so it fires after authentication succeeds.

### Enabling via pam-auth-update

The easiest method:

```bash
sudo pam-auth-update --enable mkhomedir
```

This adds the module to `/etc/pam.d/common-session`. Verify:

```bash
grep mkhomedir /etc/pam.d/common-session
```

Expected output:

```text
session optional    pam_mkhomedir.so skel=/etc/skel umask=0077
```

### Manual PAM Configuration

If `pam-auth-update` is not available or you need custom settings:

```bash
sudo nano /etc/pam.d/common-session
```

Add after the existing `session` lines:

```text
# Create home directory on first login
session required    pam_mkhomedir.so skel=/etc/skel umask=0022
```

The `umask=0022` creates directories with permissions `755` (readable by others). Use `umask=0077` for `700` (private, recommended for security).

### Testing pam_mkhomedir

```bash
# Log in as an AD user who has never logged in before
sudo -u aduser@corp.example.com ls ~

# The home directory should be created at:
ls -la /home/aduser@corp.example.com/
# (or /home/aduser/ if use_fully_qualified_names = false in sssd.conf)
```

## Method 2: oddjob (More Flexible)

`oddjob` is a D-Bus service that creates home directories with proper SELinux contexts (important on systems with SELinux) and handles edge cases better.

```bash
sudo apt install -y oddjob oddjob-mkhomedir
```

Enable and start the service:

```bash
sudo systemctl enable --now oddjobd
sudo systemctl status oddjobd
```

Update PAM to use oddjob:

```bash
sudo nano /etc/pam.d/common-session
```

Replace or complement the existing mkhomedir line:

```text
# Use oddjob for home directory creation
session optional    pam_oddjob_mkhomedir.so skel=/etc/skel umask=0022
```

Or use both (oddjob falls back to mkhomedir if D-Bus is not available):

```text
session optional    pam_oddjob_mkhomedir.so skel=/etc/skel umask=0022
session optional    pam_mkhomedir.so skel=/etc/skel umask=0022
```

## Configuring the Home Directory Path

By default, SSSD and `pam_mkhomedir` use the home directory attribute from the directory. For AD users, this is often `\\server\share\username` (Windows UNC path), which is not useful on Linux.

Override the home directory path in `/etc/sssd/sssd.conf`:

```ini
[domain/corp.example.com]
# Use this template for home directories
# %u = username, %d = domain name
fallback_homedir = /home/%u@%d

# Or without domain suffix:
fallback_homedir = /home/%u

# Or in a subdirectory organized by domain:
fallback_homedir = /home/%d/%u
```

Common patterns:

| Pattern | Result |
|---------|--------|
| `/home/%u` | `/home/jsmith` |
| `/home/%u@%d` | `/home/jsmith@corp.example.com` |
| `/home/%d/%u` | `/home/corp.example.com/jsmith` |

```bash
sudo systemctl restart sssd
```

## Customizing the Skeleton Directory

The skeleton directory (`/etc/skel`) contains files copied into every new home directory. Customize it for your environment:

```bash
# View default skeleton contents
ls -la /etc/skel/

# Add custom shell configuration
sudo nano /etc/skel/.bashrc
```

```bash
# Custom .bashrc for AD users
# Set proxy if needed
export http_proxy=http://proxy.corp.example.com:8080
export https_proxy=http://proxy.corp.example.com:8080

# Useful aliases
alias ll='ls -la'
alias vi='vim'

# Set PATH to include common locations
export PATH=$PATH:/usr/local/bin

# Kerberos ticket auto-renewal reminder
if klist -s 2>/dev/null; then
    echo "Kerberos ticket valid"
fi
```

```bash
# Add a default SSH directory structure
sudo mkdir -p /etc/skel/.ssh
sudo chmod 700 /etc/skel/.ssh

# Add corporate authorized keys (if using a shared key for jump servers)
sudo cp /path/to/corporate-keys.pub /etc/skel/.ssh/authorized_keys
sudo chmod 600 /etc/skel/.ssh/authorized_keys
```

## Setting Default Shell for AD Users

```ini
# In /etc/sssd/sssd.conf
[domain/corp.example.com]
default_shell = /bin/bash

# Or map AD attribute to shell
# If users have 'loginShell' attribute in AD:
ldap_user_shell = loginShell

# Fallback for users without a shell attribute
fallback_homedir = /home/%u
```

Ensure the shell exists on the Ubuntu system:

```bash
ls /etc/shells
# /bin/bash should be listed
```

## Managing Home Directory Permissions

After home directories are created, you may need to adjust permissions:

```bash
# Fix permissions for all AD user home directories
sudo find /home -maxdepth 1 -type d ! -name home | while read dir; do
    owner=$(stat -c '%U' "$dir")
    if id "$owner" &>/dev/null; then
        sudo chown -R "$owner:$owner" "$dir"
        sudo chmod 750 "$dir"
    fi
done
```

## Using a Shared Home Directory Server

For environments where home directories should be on a NFS server:

```bash
# Install NFS client
sudo apt install -y nfs-common

# Mount the home directories share
sudo nano /etc/fstab
```

```text
# NFS home directories
nfs.corp.example.com:/exports/homes  /home  nfs  defaults,_netdev,nfsvers=4  0  0
```

```bash
sudo mount -a
```

With NFS home directories, `pam_mkhomedir` is not needed - the directory already exists on the NFS share from Windows Profile creation, or is created by a script on the NFS server.

## Automounting Home Directories

For large environments, use autofs to mount home directories on demand:

```bash
sudo apt install -y autofs

# Configure auto.master
sudo nano /etc/auto.master
```

```text
/home   /etc/auto.home  --timeout=60
```

```bash
sudo nano /etc/auto.home
```

```text
*   nfs.corp.example.com:/exports/homes/&
```

```bash
sudo systemctl enable --now autofs
```

## Troubleshooting

### Home Directory Not Created

```bash
# Check if pam_mkhomedir is in the session stack
grep mkhomedir /etc/pam.d/common-session

# Try creating manually for testing
sudo mkhomedir_helper jsmith 0022 /etc/skel

# Check permissions on /home
ls -la / | grep home
# /home should be: drwxr-xr-x root root
```

### Wrong Home Directory Path

```bash
# Check what SSSD returns for the user's home
id jsmith
getent passwd jsmith
# Compare homeDirectory attribute

# Check sssd.conf fallback_homedir
grep fallback_homedir /etc/sssd/sssd.conf

# Clear SSSD cache and re-lookup
sudo sss_cache -u jsmith
getent passwd jsmith
```

### Permission Denied on Home Directory

```bash
# Check ownership of the home directory
ls -la /home/ | grep jsmith

# The directory should be owned by the user
# If owned by root, fix it:
sudo chown -R jsmith:domain\ users /home/jsmith
sudo chmod 750 /home/jsmith
```

### SELinux Context Issues

On systems with SELinux (not default on Ubuntu but sometimes added):

```bash
# Restore correct SELinux context
sudo restorecon -R -v /home/jsmith
```

This is where `oddjob` has an advantage over `pam_mkhomedir` - it handles SELinux contexts correctly.

With automatic home directory creation configured, the login experience for AD users is seamless - their first login creates all necessary directories and skeleton files automatically.
