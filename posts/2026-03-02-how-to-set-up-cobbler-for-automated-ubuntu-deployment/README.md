# How to Set Up Cobbler for Automated Ubuntu Deployment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cobbler, Automation, Provisioning, PXE

Description: Install and configure Cobbler on Ubuntu to automate bare-metal deployments with PXE booting, network installation, and kickstart/preseed automation.

---

Cobbler is a provisioning server that ties together DHCP, DNS, TFTP, and PXE into a unified management interface. Instead of manually managing TFTP files and DHCP options for each new machine, Cobbler lets you define distros, profiles, and systems - then handles all the infrastructure pieces automatically. It is particularly well-suited to environments where you regularly deploy new servers or need to reinstall machines reliably.

## Cobbler Architecture Overview

Cobbler works with these core concepts:
- **Distro** - a network-installable Linux distribution (kernel + initrd)
- **Profile** - associates a distro with an answer file (preseed, kickstart, or cloud-init)
- **System** - a specific machine identified by MAC address, assigned to a profile

When a machine PXE-boots, Cobbler generates the correct DHCP, TFTP, and boot menu configuration based on these objects.

## Installing Cobbler

Cobbler is available in Ubuntu's universe repository and also from pip.

```bash
# Enable universe repository if not already enabled
sudo add-apt-repository universe
sudo apt update

# Install Cobbler
sudo apt install cobbler cobbler-web

# Or install via pip for a newer version
sudo pip3 install cobbler
```

## Installing Dependencies

```bash
# Cobbler requires several supporting packages
sudo apt install apache2 dhcp-server tftpd-hpa fence-agents \
  libapache2-mod-wsgi-py3 python3-yaml python3-cheetah \
  python3-netaddr python3-simplejson

# For UEFI support
sudo apt install shim-signed grub-efi-amd64-signed
```

## Basic Cobbler Configuration

Edit the main configuration file.

```bash
sudo nano /etc/cobbler/settings.yaml
```

Key settings to configure:

```yaml
# /etc/cobbler/settings.yaml (relevant sections)

# Set the IP of your Cobbler server
server: 192.168.1.10
next_server: 192.168.1.10

# Allow Cobbler to manage DHCP
manage_dhcp: true
manage_tftpd: true
manage_dns: false   # set to true if you want Cobbler managing DNS too

# Enable TFTP
default_password_crypted: "$1$yourpasswordhash"

# PXE boot parameters
pxe_just_once: true  # prevents infinite reinstall loops
```

Generate the password hash for the default root password.

```bash
# Generate a password hash
openssl passwd -1 'your-root-password'
# Use the output in default_password_crypted
```

## Configuring DHCP Template

Cobbler manages DHCP through templates. Edit the DHCP template.

```bash
sudo nano /etc/cobbler/dhcp.template
```

```bash
# /etc/cobbler/dhcp.template (key sections)
ddns-update-style interim;

allow booting;
allow bootp;

ignore client-updates;
set vendorclass = option vendor-class-identifier;

subnet 192.168.1.0 netmask 255.255.255.0 {
     option routers             192.168.1.1;
     option domain-name-servers 8.8.8.8;
     option subnet-mask         255.255.255.0;
     range dynamic-bootp        192.168.1.100 192.168.1.200;
     default-lease-time         21600;
     max-lease-time             43200;
     next-server                $next_server;

     class "pxeclients" {
          match if substring(option vendor-class-identifier, 0, 9) = "PXEClient";
          if option pxe-system-type = 00:02 {
                  filename "ia64/elilo.efi";
          } else if option pxe-system-type = 00:06 {
                  filename "grub/grub-x86.efi";
          } else if option pxe-system-type = 00:07 {
                  filename "grub/grubx64.efi";
          } else {
                  filename "pxelinux.0";
          }
     }
}
```

## Importing an Ubuntu Distribution

Cobbler can import distros directly from ISO files or mounted install media.

```bash
# Mount the Ubuntu ISO
sudo mount -o loop /tmp/ubuntu-24.04-server.iso /mnt

# Import the distro into Cobbler
sudo cobbler import --name=ubuntu-24.04 --arch=x86_64 --path=/mnt

# This automatically creates a distro and a profile
# Verify the import
sudo cobbler distro list
sudo cobbler profile list
```

If the import succeeds, Cobbler creates:
- A distro named `ubuntu-24.04-x86_64`
- A profile named `ubuntu-24.04-x86_64`
- Copies the kernel and initrd to the TFTP root

## Creating a Preseed File for Ubuntu

Ubuntu uses preseed files for automated installation. Create one for Cobbler.

```bash
sudo nano /var/lib/cobbler/templates/ubuntu-preseed.seed
```

```bash
# /var/lib/cobbler/templates/ubuntu-preseed.seed
# Locale and keyboard
d-i debian-installer/locale string en_US.UTF-8
d-i keyboard-configuration/xkb-keymap select us

# Network
d-i netcfg/choose_interface select auto
d-i netcfg/get_hostname string $system_name
d-i netcfg/get_domain string example.com

# Clock
d-i clock-setup/utc boolean true
d-i time/zone string UTC

# Partitioning - use entire disk
d-i partman-auto/method string regular
d-i partman-auto/choose_recipe select atomic
d-i partman/confirm boolean true
d-i partman/confirm_nooverwrite boolean true

# Users
d-i passwd/root-login boolean false
d-i passwd/user-fullname string Admin User
d-i passwd/username string admin
d-i passwd/user-password-crypted password $default_password_crypted

# Packages
tasksel tasksel/first multiselect server
d-i pkgsel/include string openssh-server

# Grub
d-i grub-installer/only_debian boolean true
d-i grub-installer/bootdev string default

# Finish
d-i finish-install/reboot_in_progress note
```

## Associating the Preseed with a Profile

```bash
# Update the profile to use the preseed file
sudo cobbler profile edit \
  --name=ubuntu-24.04-x86_64 \
  --autoinstall=ubuntu-preseed.seed \
  --autoinstall-meta="tree=http://192.168.1.10/cobbler/links/ubuntu-24.04-x86_64"
```

## Adding a System (Specific Machine)

To deploy a specific machine, add it as a system object with its MAC address.

```bash
# Add a system with its MAC address and assign to a profile
sudo cobbler system add \
  --name=webserver01 \
  --mac=aa:bb:cc:dd:ee:ff \
  --profile=ubuntu-24.04-x86_64 \
  --ip-address=192.168.1.101 \
  --netmask=255.255.255.0 \
  --gateway=192.168.1.1 \
  --hostname=webserver01 \
  --name-servers=8.8.8.8 \
  --interface=eth0

# Verify the system
sudo cobbler system list
sudo cobbler system report --name=webserver01
```

## Syncing Cobbler Configuration

After making changes, sync Cobbler to regenerate DHCP and TFTP configurations.

```bash
# Sync all Cobbler-managed services
sudo cobbler sync

# Check for configuration errors
sudo cobbler check
```

The `cobbler check` command lists any prerequisites that are missing or misconfigured, such as required modules not loaded or services not running.

## Starting Cobbler Services

```bash
# Enable and start Cobbler
sudo systemctl enable cobbler
sudo systemctl start cobbler

# Restart DHCP and TFTP after sync
sudo systemctl restart isc-dhcp-server
sudo systemctl restart tftpd-hpa

# Verify services
sudo systemctl status cobbler
sudo systemctl status isc-dhcp-server
sudo systemctl status tftpd-hpa
```

## Using the Cobbler Web Interface

Cobbler includes a web interface for managing distros, profiles, and systems.

```bash
# The web interface is available at:
# https://192.168.1.10/cobbler_web

# Default credentials (change immediately)
# Username: cobbler
# Password: cobbler

# Change the web interface password
sudo htdigest /etc/cobbler/users.digest "Cobbler" cobbler
```

## Troubleshooting

```bash
# Check Cobbler logs
sudo journalctl -u cobbler -f

# Verify TFTP files were generated
ls /var/lib/tftpboot/

# Test DHCP configuration
sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf

# Check Cobbler API
sudo cobbler distro list
sudo cobbler profile list
sudo cobbler system list

# If sync fails, check the Cobbler log
sudo tail -f /var/log/cobbler/cobbler.log
```

Cobbler significantly reduces the operational overhead of managing bare-metal deployments. Once profiles are defined, adding a new machine is as simple as running `cobbler system add` with the MAC address and triggering a sync.
