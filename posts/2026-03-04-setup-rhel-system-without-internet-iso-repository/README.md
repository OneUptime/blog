# How to Set Up a RHEL System Without Internet Using an ISO Repository

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Offline Installation, ISO Repository, Linux, Air-Gapped

Description: Step-by-step instructions for configuring a local package repository from a RHEL ISO image, enabling system management in air-gapped environments without internet access.

---

Not every RHEL system lives on a network with internet access. Secure environments, industrial control systems, classified networks, and factory floors often require fully air-gapped deployments. In these situations, you need to set up a local repository from the RHEL installation ISO to install packages and perform system administration. This guide walks through the entire process.

## When You Need an ISO Repository

- Air-gapped or disconnected networks with no internet access
- Environments where security policy prohibits connecting to external services
- Remote sites with unreliable internet connections
- Development or lab environments where you do not want to consume subscription bandwidth
- Quick package installs without waiting for a full Satellite deployment

## What You Need

- The RHEL installation ISO (e.g., `rhel-9.3-x86_64-dvd.iso`)
- Enough disk space to store the ISO or its contents (approximately 10 GB)
- Root or sudo access on the target system

## Step 1 - Transfer the ISO to the System

Get the ISO onto the air-gapped system using whatever method your environment allows (USB drive, burned DVD, SCP from a transfer station):

```bash
# Copy the ISO to a known location
sudo cp /media/usb/rhel-9.3-x86_64-dvd.iso /opt/rhel9.iso
```

## Step 2 - Create a Mount Point and Mount the ISO

```bash
# Create a permanent mount point
sudo mkdir -p /mnt/rhel9-iso

# Mount the ISO read-only
sudo mount -o loop,ro /opt/rhel9.iso /mnt/rhel9-iso
```

Verify the mount:

```bash
# Confirm the ISO contents are accessible
ls /mnt/rhel9-iso/
```

You should see directories like `BaseOS`, `AppStream`, `EFI`, `images`, and others.

## Step 3 - Make the Mount Persistent

Add the mount to `/etc/fstab` so it survives reboots:

```bash
# Add ISO mount to fstab
echo '/opt/rhel9.iso  /mnt/rhel9-iso  iso9660  loop,ro  0 0' | sudo tee -a /etc/fstab
```

Verify it works:

```bash
# Test the fstab entry
sudo umount /mnt/rhel9-iso
sudo mount -a
ls /mnt/rhel9-iso/BaseOS/
```

## Step 4 - Create the Repository Configuration

Create a repo file that points `dnf` to the mounted ISO:

```bash
# Create the local repository configuration
sudo tee /etc/yum.repos.d/rhel9-local.repo << 'EOF'
[rhel9-baseos-local]
name=RHEL BaseOS (Local ISO)
baseurl=file:///mnt/rhel9-iso/BaseOS/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release

[rhel9-appstream-local]
name=RHEL AppStream (Local ISO)
baseurl=file:///mnt/rhel9-iso/AppStream/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release
EOF
```

## Step 5 - Disable Other Repositories

If the system has any other repo configurations that it cannot reach, disable them to avoid timeout errors:

```bash
# Disable subscription-manager managed repos (since we have no subscription)
sudo subscription-manager config --rhsm.manage_repos=0

# Or disable individual repo files
sudo dnf config-manager --set-disabled rhel-9-for-x86_64-baseos-rpms 2>/dev/null
sudo dnf config-manager --set-disabled rhel-9-for-x86_64-appstream-rpms 2>/dev/null
```

## Step 6 - Test the Local Repository

```bash
# Clean the dnf cache
sudo dnf clean all

# List available repos
sudo dnf repolist

# Search for a package
sudo dnf search httpd

# Install a package to confirm everything works
sudo dnf install -y tree
```

## Architecture of an ISO-Based Setup

```mermaid
flowchart TD
    A[RHEL ISO] -->|Mount| B[/mnt/rhel9-iso/]
    B --> C[BaseOS Repository]
    B --> D[AppStream Repository]
    E[/etc/yum.repos.d/rhel9-local.repo] -->|Points to| C
    E -->|Points to| D
    F[dnf] -->|Uses| E
    F -->|Installs packages from| C
    F -->|Installs packages from| D
```

## Alternative: Copy ISO Contents to Disk

If you do not want to keep the ISO mounted, copy the contents to a directory:

```bash
# Create a directory for the repository
sudo mkdir -p /opt/rhel9-repo

# Mount the ISO temporarily
sudo mount -o loop,ro /opt/rhel9.iso /mnt/rhel9-iso

# Copy the contents
sudo cp -a /mnt/rhel9-iso/BaseOS /opt/rhel9-repo/
sudo cp -a /mnt/rhel9-iso/AppStream /opt/rhel9-repo/

# Unmount the ISO
sudo umount /mnt/rhel9-iso
```

Then update the repo file to point to the copied location:

```bash
# Update repo configuration for copied files
sudo tee /etc/yum.repos.d/rhel9-local.repo << 'EOF'
[rhel9-baseos-local]
name=RHEL BaseOS (Local Copy)
baseurl=file:///opt/rhel9-repo/BaseOS/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release

[rhel9-appstream-local]
name=RHEL AppStream (Local Copy)
baseurl=file:///opt/rhel9-repo/AppStream/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release
EOF
```

## Sharing the ISO Repository Over the Network

If you have multiple air-gapped systems on the same local network, share the repository via HTTP:

```bash
# Install Apache from the local repo
sudo dnf install -y httpd

# Create a symlink to serve the repo
sudo ln -s /mnt/rhel9-iso /var/www/html/rhel9-repo

# Start and enable Apache
sudo systemctl enable --now httpd

# Open the firewall for HTTP
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

On client systems, configure the repo to point to the HTTP server:

```bash
# Remote repo configuration pointing to the local server
sudo tee /etc/yum.repos.d/rhel9-local.repo << 'EOF'
[rhel9-baseos-local]
name=RHEL BaseOS (Network)
baseurl=http://reposerver.local/rhel9-repo/BaseOS/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release

[rhel9-appstream-local]
name=RHEL AppStream (Network)
baseurl=http://reposerver.local/rhel9-repo/AppStream/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release
EOF
```

## Limitations of ISO Repositories

There are some things to keep in mind:

- **No updates**: The ISO contains a snapshot of packages at a specific release. There are no security errata or bug fixes beyond what is on the ISO.
- **No additional repos**: Repos like CodeReady Builder or High Availability are not on the standard DVD ISO.
- **Package versions are fixed**: You get only the versions included on the ISO.

For environments that need updates in air-gapped networks, consider setting up a Satellite Server with disconnected content sync, or manually transfer updated RPMs.

## Updating the Repository

When a new RHEL minor release ISO becomes available, update your repository:

```bash
# Unmount the old ISO
sudo umount /mnt/rhel9-iso

# Replace with the new ISO
sudo mv /opt/rhel9.iso /opt/rhel9-old.iso
sudo cp /media/usb/rhel-9.4-x86_64-dvd.iso /opt/rhel9.iso

# Remount
sudo mount -a

# Clean dnf cache to pick up new packages
sudo dnf clean all
sudo dnf makecache
```

## Summary

Setting up a local RHEL repository from an ISO is a straightforward process that takes about 10 minutes. Mount the ISO, create a repo file, and you are ready to install packages in a fully disconnected environment. For networks with multiple systems, share the repo over HTTP to avoid needing an ISO on every machine. Just remember that ISO repos are static snapshots, so plan for a process to update them as new releases come out.
