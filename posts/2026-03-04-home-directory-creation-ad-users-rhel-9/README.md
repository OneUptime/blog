# How to Configure Home Directory Creation for AD Users on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Active Directory, Home Directory, PAM, Linux

Description: A guide to configuring automatic home directory creation for Active Directory users on RHEL 9, covering PAM configuration, oddjobd, authselect, and NFS-based home directories.

---

When an AD user logs into a RHEL 9 system for the first time, they need a home directory. Without one, their login session starts in `/` or fails entirely, and nothing works right. RHEL 9 uses a combination of PAM (pam_oddjob_mkhomedir) and the oddjobd service to create home directories on the fly. This guide covers the configuration and a few alternative approaches for different environments.

## How Automatic Home Directory Creation Works

```mermaid
flowchart LR
    A[AD User Logs In] --> B[PAM Authentication]
    B --> C[pam_oddjob_mkhomedir]
    C --> D[oddjobd Service]
    D --> E[Creates /home/username]
    E --> F[Copies /etc/skel Contents]
    F --> G[User Session Starts]
```

When PAM encounters a user without a home directory, it calls the oddjobd daemon through D-Bus. oddjobd creates the directory with proper ownership and copies skeleton files from `/etc/skel/`.

## Step 1 - Enable mkhomedir with authselect

The recommended way to configure home directory creation on RHEL 9 is through authselect.

```bash
# Check the current authselect profile
authselect current

# Enable the mkhomedir feature
sudo authselect enable-feature with-mkhomedir

# Verify the feature is enabled
authselect current
```

## Step 2 - Enable and Start oddjobd

The oddjobd service handles the actual directory creation. It must be running.

```bash
# Enable and start oddjobd
sudo systemctl enable --now oddjobd

# Verify it is running
sudo systemctl status oddjobd
```

## Step 3 - Configure the Home Directory Template

New home directories are populated from `/etc/skel/`. Customize the skeleton directory to include default files for your users.

```bash
# See what is in the skeleton directory
ls -la /etc/skel/

# Add a default .bashrc with useful settings
cat > /tmp/skel-bashrc << 'EOF'
# Default bashrc for AD users
if [ -f /etc/bashrc ]; then
    . /etc/bashrc
fi

# User specific aliases
alias ll='ls -la'
alias la='ls -A'
EOF

sudo cp /tmp/skel-bashrc /etc/skel/.bashrc

# Add a default .bash_profile
cat > /tmp/skel-profile << 'EOF'
# Get the aliases and functions
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi

# User specific environment
PATH="$HOME/.local/bin:$HOME/bin:$PATH"
export PATH
EOF

sudo cp /tmp/skel-profile /etc/skel/.bash_profile
```

## Step 4 - Configure SSSD Home Directory Settings

SSSD controls the home directory path format. Adjust it to match your environment.

```bash
# Edit SSSD configuration
sudo vi /etc/sssd/sssd.conf
```

Common configurations:

```ini
[domain/example.com]
# Use the username only (not the domain)
fallback_homedir = /home/%u

# Or include the domain for multi-domain environments
# fallback_homedir = /home/%d/%u

# Or use a flat structure based on the short domain name
# fallback_homedir = /home/%u@%d
```

After changing SSSD settings:

```bash
sudo sss_cache -E
sudo systemctl restart sssd
```

## Step 5 - Set Home Directory Permissions

Configure the default permissions for newly created home directories.

```bash
# Check the current umask setting for home directory creation
grep -r "umask" /etc/oddjobd/oddjobd.conf.d/ /etc/login.defs
```

The oddjobd configuration file controls the permissions:

```bash
# View the oddjobd mkhomedir configuration
cat /etc/oddjobd/oddjobd.conf.d/oddjobd-mkhomedir.conf
```

To change the default permissions, modify the umask. The default is typically 0077 (owner-only access):

```bash
# Edit the mkhomedir configuration
sudo vi /etc/oddjobd/oddjobd.conf.d/oddjobd-mkhomedir.conf
```

Look for the `umask` attribute and adjust if needed. A value of `0077` means only the user can access their home directory. A value of `0022` makes it world-readable.

After changes:

```bash
sudo systemctl restart oddjobd
```

## Step 6 - Test Home Directory Creation

```bash
# Log in as an AD user
su - aduser@example.com

# Verify the home directory was created
pwd
ls -la ~

# Check ownership
ls -ld /home/aduser
```

## Alternative: NFS-Based Home Directories

In larger environments, you might want centralized home directories served via NFS instead of local directories on each machine.

### Configure the NFS Server

```bash
# On the NFS server, create the home directory export
sudo mkdir -p /exports/home

# Add to exports
echo "/exports/home *(rw,sync,no_subtree_check)" | sudo tee -a /etc/exports

# Apply the export
sudo exportfs -ra
```

### Configure RHEL Clients for NFS Home Directories

```bash
# Install autofs for automatic mounting
sudo dnf install autofs -y

# Configure the auto.master
echo "/home /etc/auto.home" | sudo tee -a /etc/auto.master

# Configure auto.home to mount from NFS
echo "* -rw,sync nfs-server:/exports/home/&" | sudo tee /etc/auto.home

# Enable and start autofs
sudo systemctl enable --now autofs
```

When using NFS home directories, disable the local mkhomedir:

```bash
# Disable local home directory creation
sudo authselect disable-feature with-mkhomedir

# Create home directories on the NFS server instead
# (either manually or with a script triggered by user creation)
```

## Alternative: Using pam_mkhomedir Directly

If you cannot use oddjobd, you can use pam_mkhomedir directly in the PAM configuration. This is less recommended on RHEL 9 but works.

```bash
# Check if pam_mkhomedir is configured
grep mkhomedir /etc/pam.d/system-auth
```

## Troubleshooting

### Home Directory Not Created

```bash
# Check if oddjobd is running
sudo systemctl status oddjobd

# Check if the mkhomedir feature is enabled
authselect current

# Check PAM configuration
grep -r mkhomedir /etc/pam.d/

# Test manually
sudo mkhomedir_helper aduser 0077
```

### Permission Issues

```bash
# Check SELinux context on home directories
ls -laZ /home/

# If SELinux labels are wrong, restore them
sudo restorecon -Rv /home/
```

### Home Directory Created But Empty

```bash
# Verify /etc/skel contents
ls -la /etc/skel/

# Check that the skel directory is readable
sudo stat /etc/skel/
```

### Wrong Home Directory Path

```bash
# Check SSSD configuration for fallback_homedir
sudo grep fallback_homedir /etc/sssd/sssd.conf

# Check what SSSD returns for the user
getent passwd aduser
```

Getting home directory creation right is a small detail that makes a big difference in the user experience. Set it up once, test it with a few users, and then you can forget about it. The combination of authselect, oddjobd, and SSSD handles everything cleanly.
