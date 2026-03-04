# How to Perform an Unattended RHEL Installation Using Kickstart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kickstart, Unattended Installation, Automation, Linux

Description: Complete guide to building a Kickstart file for fully unattended RHEL installations, covering every section of the Kickstart configuration, boot options, and serving the file over the network.

---

If you have ever sat through a RHEL installation clicking through Anaconda screens, you know it gets old fast after the third server. Kickstart lets you automate the entire process with a configuration file that answers every question the installer would ask. One file, zero interaction, consistent results every time. Here is how to set it up properly.

## What Kickstart Does

Kickstart is Red Hat's answer to unattended installations. You write a configuration file that specifies everything: disk layout, network config, packages to install, user accounts, services to enable, and post-install scripts. The Anaconda installer reads this file and executes the installation without any human interaction.

The workflow looks like this:

```mermaid
flowchart LR
    A[Boot from ISO/PXE] --> B[Installer reads Kickstart file]
    B --> C[Partitioning]
    C --> D[Package Installation]
    D --> E[Post-install Scripts]
    E --> F[Reboot into configured system]
```

## Writing the Kickstart File

A Kickstart file is a plain text file with directives organized into sections. Let me walk through a complete, production-ready example.

### Complete Kickstart File

```bash
# kickstart.cfg - Unattended RHEL Server Installation
# This file automates a full RHEL minimal server setup

# Use text mode installer (no GUI needed for unattended install)
text

# Installation source - use the RHEL DVD/ISO
# For network installs, replace with: url --url="http://repo-server/rhel9/"
cdrom

# Accept the EULA
eula --agreed

# System language and keyboard
lang en_US.UTF-8
keyboard us

# Network configuration - static IP example
network --bootproto=static --device=ens192 --ip=192.168.1.100 --netmask=255.255.255.0 --gateway=192.168.1.1 --nameserver=192.168.1.10,8.8.8.8 --hostname=server01.example.com --activate

# For DHCP instead, use:
# network --bootproto=dhcp --device=ens192 --hostname=server01.example.com --activate

# Root password (encrypted) - generate with: python3 -c 'import crypt; print(crypt.crypt("YourPassword", crypt.mksalt(crypt.METHOD_SHA512)))'
rootpw --iscrypted $6$rounds=4096$randomsalt$hashedpasswordhere

# Create a regular admin user
user --name=sysadmin --groups=wheel --iscrypted --password=$6$rounds=4096$randomsalt$hashedpasswordhere

# System timezone
timezone UTC --utc

# Disable the Setup Agent on first boot
firstboot --disabled

# SELinux configuration
selinux --enforcing

# Firewall configuration
firewall --enabled --ssh

# System bootloader configuration
bootloader --location=mbr --boot-drive=sda

# Disk partitioning - clear all existing partitions
clearpart --all --initlabel --drives=sda
ignoredisk --only-use=sda

# Partitioning layout using LVM
part /boot --fstype=xfs --size=1024
part /boot/efi --fstype=efi --size=600
part pv.01 --size=1 --grow

volgroup rhel pv.01
logvol / --vgname=rhel --name=root --fstype=xfs --size=20480
logvol /var --vgname=rhel --name=var --fstype=xfs --size=10240
logvol /var/log --vgname=rhel --name=log --fstype=xfs --size=5120
logvol /home --vgname=rhel --name=home --fstype=xfs --size=5120
logvol /tmp --vgname=rhel --name=tmp --fstype=xfs --size=2048
logvol swap --vgname=rhel --name=swap --size=4096

# Reboot after installation
reboot --eject

# Package selection
%packages
@^minimal-environment
vim-enhanced
tmux
wget
curl
bash-completion
bind-utils
net-tools
tcpdump
lsof
rsync
policycoreutils-python-utils
cockpit
dnf-automatic
chrony
%end
```

### Post-Install Script

The `%post` section runs after package installation. This is where you do final configuration.

```bash
%post --log=/root/ks-post.log
# Post-installation script - runs in the installed system

# Enable essential services
systemctl enable cockpit.socket
systemctl enable dnf-automatic-install.timer
systemctl enable chronyd

# Configure SSH hardening
cat > /etc/ssh/sshd_config.d/50-hardening.conf << 'SSHEOF'
PermitRootLogin no
MaxAuthTries 3
PermitEmptyPasswords no
X11Forwarding no
SSHEOF

# Configure dnf-automatic for security updates
sed -i 's/^upgrade_type = default/upgrade_type = security/' /etc/dnf/automatic.conf

# Set up persistent journal logging
mkdir -p /var/log/journal

# Add SSH public key for the sysadmin user
mkdir -p /home/sysadmin/.ssh
chmod 700 /home/sysadmin/.ssh
cat > /home/sysadmin/.ssh/authorized_keys << 'KEYEOF'
ssh-rsa AAAA...your-public-key-here sysadmin@workstation
KEYEOF
chmod 600 /home/sysadmin/.ssh/authorized_keys
chown -R sysadmin:sysadmin /home/sysadmin/.ssh

# Restore SELinux context on the SSH directory
restorecon -R /home/sysadmin/.ssh

%end
```

### Pre-Install Script

You can also run scripts before installation begins. This is less common but useful for dynamic disk selection or hardware detection.

```bash
%pre --log=/tmp/ks-pre.log
# Pre-installation script - runs in the installer environment

# Example: find the largest disk and write it to a file for partitioning
DISK=$(lsblk -dno NAME,SIZE | sort -k2 -h | tail -1 | awk '{print $1}')
echo "Selected disk: $DISK" >> /tmp/ks-pre.log

%end
```

## Generating an Encrypted Password

The Kickstart file should never contain plain-text passwords. Generate encrypted passwords using Python:

```bash
# Generate a SHA-512 encrypted password
python3 -c 'import crypt; print(crypt.crypt("YourSecurePassword", crypt.mksalt(crypt.METHOD_SHA512)))'
```

Or use `openssl`:

```bash
# Alternative: use openssl to generate the hash
openssl passwd -6 -salt $(openssl rand -hex 8)
```

Copy the output and use it with the `--iscrypted` flag in your Kickstart file.

## Validating the Kickstart File

Before using your Kickstart file in production, validate it:

```bash
# Install the Kickstart validation tool
sudo dnf install -y pykickstart

# Validate the file
ksvalidator kickstart.cfg
```

This catches syntax errors, deprecated directives, and invalid options before you waste time on a failed installation.

## Booting with a Kickstart File

There are several ways to tell the Anaconda installer where to find the Kickstart file.

### From a Local File on the Boot Media

If you have embedded the Kickstart file in the ISO or placed it on a USB drive:

1. Boot from the installation media
2. At the GRUB boot menu, press `Tab` (BIOS) or `e` (UEFI) to edit the boot options
3. Append the Kickstart location to the kernel line:

```bash
inst.ks=hd:LABEL=RHEL-9-BaseOS:/kickstart.cfg
```

### From an HTTP Server

This is the most common approach for network installations:

```bash
inst.ks=http://192.168.1.50/kickstart.cfg
```

### From an NFS Share

```bash
inst.ks=nfs:192.168.1.50:/exports/kickstart.cfg
```

### From an FTP Server

```bash
inst.ks=ftp://192.168.1.50/kickstart.cfg
```

## Serving the Kickstart File Over HTTP

The simplest approach is hosting the file on a basic web server.

```bash
# On your kickstart server, install Apache
sudo dnf install -y httpd

# Copy the kickstart file to the web root
sudo cp kickstart.cfg /var/www/html/

# Set proper permissions
sudo chmod 644 /var/www/html/kickstart.cfg

# Enable and start Apache
sudo systemctl enable --now httpd

# Open the firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

Test that the file is accessible:

```bash
# From another machine, verify you can fetch the file
curl http://192.168.1.50/kickstart.cfg
```

## Boot Parameters Reference

Here are the most commonly used boot parameters for Kickstart installations:

| Parameter | Description |
|-----------|-------------|
| `inst.ks=URL` | Location of the Kickstart file |
| `inst.repo=URL` | Location of the installation repository |
| `inst.text` | Force text mode installation |
| `inst.vnc` | Enable VNC access to the installer |
| `inst.vnc.password=pass` | Set VNC password for remote viewing |
| `ip=dhcp` | Use DHCP for installer networking |
| `nameserver=IP` | DNS server for the installer |
| `inst.stage2=URL` | Location of the installer runtime image |

## Common Kickstart Directives Reference

Here is a quick reference for directives you will use frequently:

```bash
# Use network installation source
url --url="http://repo-server/rhel9/BaseOS/"

# Configure multiple network interfaces
network --bootproto=dhcp --device=ens192 --activate
network --bootproto=static --device=ens224 --ip=10.0.0.100 --netmask=255.255.255.0 --nodefroute

# RAID configuration example
part raid.01 --size=20480 --ondisk=sda
part raid.02 --size=20480 --ondisk=sdb
raid / --level=1 --device=md0 --fstype=xfs raid.01 raid.02

# Skip specific packages from a group
%packages
@^minimal-environment
-iwl*-firmware
-plymouth
%end

# Add a repository for additional packages
repo --name=epel --baseurl=https://dl.fedoraproject.org/pub/epel/9/Everything/x86_64/
```

## Debugging Failed Installations

If your Kickstart installation fails, you need to figure out what went wrong.

```bash
# Anaconda logs are stored in /tmp during installation
# Switch to a virtual console during install with Ctrl+Alt+F2
# Then check:
less /tmp/anaconda.log
less /tmp/packaging.log
less /tmp/storage.log
less /tmp/ks-script-*.log
```

After a successful installation, the logs are copied to:

```bash
# Post-install Anaconda logs
ls /var/log/anaconda/
```

The `ks-post.log` file (from the `--log` option in our `%post` section) will show the output of your post-install scripts.

## Tips from Production Use

A few things I have learned from deploying hundreds of servers with Kickstart:

- **Always validate** your Kickstart file with `ksvalidator` before deploying. A typo in the partitioning section can wipe the wrong disk.
- **Use `--iscrypted` passwords.** Never put plain text passwords in Kickstart files. These files often end up in version control or on shared web servers.
- **Log your %post scripts.** Use `--log=/root/ks-post.log` so you can review what happened after the install.
- **Test in a VM first.** Set up a quick VM, point it at your Kickstart file, and verify everything works before rolling it out to physical hardware.
- **Version control your Kickstart files.** Treat them like code. Track changes, review modifications, and keep a history.
- The generated Kickstart file from a manual installation (`/root/anaconda-ks.cfg`) is a great starting point for building your own.

Kickstart takes the manual labor out of RHEL installations. Once you have a tested file, every server you deploy will be identical, which is exactly what you want in production.
