# How to Install Ubuntu Server 24.04 LTS Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Server, Installation, LTS

Description: A complete step-by-step guide to installing Ubuntu Server 24.04 LTS, covering download, bootable USB creation, partitioning, and post-install configuration.

---

Ubuntu Server 24.04 LTS (Noble Numbat) is the latest long-term support release from Canonical, backed with five years of standard support and up to ten years under Ubuntu Pro. Whether you're building a home lab, hosting a web server, or provisioning cloud infrastructure, 24.04 LTS is the stable, well-supported foundation worth knowing how to install properly.

This walkthrough covers a fresh bare-metal or virtual machine install from scratch.

## Prerequisites

Before you begin, gather the following:

- A machine with at least 2 GB RAM (4 GB recommended), 20 GB disk, and a 64-bit CPU
- A USB drive of 4 GB or larger
- The Ubuntu Server 24.04 LTS ISO, downloaded from [ubuntu.com/download/server](https://ubuntu.com/download/server)
- A tool to write the ISO: `dd` on Linux/macOS, or Rufus/balenaEtcher on Windows

## Creating a Bootable USB

On Linux or macOS, use `dd` to write the ISO directly to the USB drive. Identify your USB device first:

```bash
# List block devices to find your USB drive (e.g., /dev/sdb or /dev/disk2)
lsblk
```

Then write the image:

```bash
# Replace /dev/sdX with your actual USB device - this will erase everything on it
sudo dd if=ubuntu-24.04-live-server-amd64.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

On Windows, use Rufus: select the ISO, choose GPT partition scheme for UEFI systems, and click Start.

## Booting the Installer

Insert the USB drive, restart the machine, and enter the boot menu (usually F12, F2, Del, or Esc depending on the motherboard). Select your USB drive. You should see the GRUB bootloader with the Ubuntu installer option.

If you have Secure Boot enabled in UEFI firmware, Ubuntu's installer is signed and will boot correctly without disabling it.

## Language and Keyboard

The first screen asks for your language. Select English (or your preferred language). Next, configure your keyboard layout. The installer can auto-detect it, or you can choose manually from the list.

## Network Configuration

The installer uses Netplan under the hood. On the network screen you will see your detected interfaces. For most setups, DHCP is fine during installation - you can configure static IPs afterward via Netplan. If your server needs a static address from day one, select the interface, choose "Edit IPv4", set the method to Manual, and fill in:

- Subnet: e.g., `192.168.1.0/24`
- Address: e.g., `192.168.1.50`
- Gateway: e.g., `192.168.1.1`
- DNS: e.g., `1.1.1.1, 8.8.8.8`

## Proxy and Mirror

Leave the proxy blank unless your network requires one. The installer will test the Ubuntu archive mirror and suggest the best one for your region. Accept the default or enter a custom mirror URL.

## Storage Configuration

This is the most important decision during installation.

### Using the Entire Disk

The simplest option is "Use an entire disk". The installer will create a GPT partition table with an EFI System Partition, a small boot partition, and an LVM volume group containing a logical volume for `/`.

Check "Set up this disk as an LVM group" to get the flexibility to resize volumes later.

### Custom Partitioning

For more control, choose "Custom storage layout". A typical server partition scheme looks like this:

| Mount Point | Size    | Type  |
|-------------|---------|-------|
| /boot/efi   | 512 MB  | fat32 |
| /boot       | 1 GB    | ext4  |
| /           | 20+ GB  | ext4  |
| /var        | 10+ GB  | ext4  |
| swap        | 2-4 GB  | swap  |

Putting `/var` on its own partition protects the root filesystem if logs or databases fill up disk space.

## Profile Setup

Enter a server name (hostname), your full name, a username, and a password. The username you create here becomes the default sudo-capable account. There is no root login by default.

## SSH Setup

On the SSH screen, enable "Install OpenSSH server". This is essential for remote management. You can also import SSH public keys directly from GitHub or Launchpad by entering your username - the installer will fetch your keys automatically.

## Featured Snaps

The installer offers optional snap packages: Docker, Microk8s, Nextcloud, and others. You can install these now or skip and add them later. For a clean base, skip them.

## Installation

Confirm your choices on the summary screen and hit "Install". The installer will:

1. Partition the disk
2. Install the base system
3. Configure bootloader (GRUB)
4. Apply your profile and SSH settings
5. Update packages

Installation typically takes 5-15 minutes depending on hardware and network speed.

## First Boot

After installation completes, remove the USB drive and reboot. The system boots into a text console. Log in with the credentials you created.

## Post-Installation Steps

Update the system immediately:

```bash
# Refresh package lists and upgrade all installed packages
sudo apt update && sudo apt upgrade -y
```

Check your IP address:

```bash
# Show IP addresses for all interfaces
ip addr show
```

Verify SSH is running:

```bash
# Check SSH service status
sudo systemctl status ssh
```

Set the timezone:

```bash
# List available timezones and set yours
timedatectl list-timezones | grep America
sudo timedatectl set-timezone America/New_York
```

Configure the firewall:

```bash
# Allow SSH through UFW and enable the firewall
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

## Enabling Automatic Security Updates

Unattended upgrades keep your server patched without manual intervention:

```bash
# Install unattended-upgrades if not already present
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## Verifying the Installation

Check kernel version and system information:

```bash
# Show kernel version
uname -r

# Show Ubuntu release information
lsb_release -a

# Show disk usage
df -h

# Show memory usage
free -h
```

At this point you have a fully functional Ubuntu Server 24.04 LTS installation ready for whatever workload you have in mind - web servers, databases, containers, or monitoring infrastructure.

For production servers, the next step is hardening SSH (disabling password auth, setting up key-based login), configuring Netplan for a static IP if needed, and setting up monitoring. Tools like [OneUptime](https://oneuptime.com) can monitor your server's availability and alert you when something goes wrong.
