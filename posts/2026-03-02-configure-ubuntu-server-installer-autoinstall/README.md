# How to Configure the Ubuntu Server Installer with Autoinstall

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Autoinstall, Automation, Installation, DevOps

Description: Learn how to use Ubuntu's Autoinstall (subiquity) feature to create fully automated, repeatable Ubuntu Server installations with custom storage, users, packages, and post-install scripts.

---

Ubuntu 20.04 introduced Autoinstall as the new automated installation mechanism for the live server installer (subiquity). It replaces the older preseed method and provides a cleaner, more powerful YAML-based configuration. Autoinstall handles everything the interactive installer does - partitioning, user creation, package installation, network configuration - through a single configuration file served over HTTP, embedded in a custom ISO, or provided via cloud-init.

## Autoinstall vs Preseed

Autoinstall is purpose-built for the subiquity installer used in Ubuntu Server 20.04 and later. Preseed was designed for the older debian-installer and does not work with subiquity. If you are automating installations on Ubuntu 20.04+, Autoinstall is the correct approach.

## Autoinstall Configuration File Structure

The Autoinstall config is a YAML file. The minimal required sections are `version` and at least one other directive. Here is the complete structure with common options:

```yaml
# autoinstall.yaml
version: 1

# Locale and keyboard
locale: en_US.UTF-8

keyboard:
  layout: us
  variant: ""

# Network configuration (Netplan format)
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: true

# Storage configuration
storage:
  layout:
    name: lvm

# Identity - user account
identity:
  hostname: ubuntu-server
  username: admin
  # Generate with: openssl passwd -6 "password"
  password: "$6$rounds=4096$salt$hashedpassword"

# SSH configuration
ssh:
  install-server: true
  authorized-keys:
    - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... your_key"
  allow-pw: false

# Packages to install
packages:
  - curl
  - wget
  - vim
  - htop
  - ufw

# Update policy
updates: security

# Late commands run after installation
late-commands:
  - curtin in-target -- apt-get update
  - curtin in-target -- apt-get upgrade -y
```

## Storage Configuration

Storage is the most complex section. Autoinstall supports several approaches.

### Preset Layouts

The simplest option - use a named layout:

```yaml
storage:
  layout:
    name: lvm       # LVM on the largest disk
    # name: direct  # Flat partitioning, no LVM
```

For LVM with encryption:

```yaml
storage:
  layout:
    name: lvm
    match:
      size: largest  # Use the largest available disk
    encrypted: true
    password: "luks-passphrase"
```

### Custom Storage Configuration

For full control, use the `config` key with explicit actions. This mirrors curtin's storage syntax:

```yaml
storage:
  config:
    # Disk reference
    - id: disk-sda
      type: disk
      ptable: gpt
      path: /dev/sda
      wipe: superblock-recursive
      grub_device: true

    # EFI partition
    - id: partition-efi
      type: partition
      device: disk-sda
      size: 512M
      flag: boot

    # Format EFI partition
    - id: format-efi
      type: format
      fstype: fat32
      volume: partition-efi

    # Mount EFI partition
    - id: mount-efi
      type: mount
      device: format-efi
      path: /boot/efi

    # Boot partition
    - id: partition-boot
      type: partition
      device: disk-sda
      size: 1G

    - id: format-boot
      type: format
      fstype: ext4
      volume: partition-boot

    - id: mount-boot
      type: mount
      device: format-boot
      path: /boot

    # LVM physical volume
    - id: partition-lvm
      type: partition
      device: disk-sda
      size: -1    # Use remaining space

    # Volume group
    - id: vg-main
      type: lvm_volgroup
      name: vg-main
      devices: [partition-lvm]

    # Root logical volume
    - id: lv-root
      type: lvm_partition
      volgroup: vg-main
      name: lv-root
      size: 30G

    - id: format-root
      type: format
      fstype: ext4
      volume: lv-root

    - id: mount-root
      type: mount
      device: format-root
      path: /

    # Swap logical volume
    - id: lv-swap
      type: lvm_partition
      volgroup: vg-main
      name: lv-swap
      size: 4G

    - id: format-swap
      type: format
      fstype: swap
      volume: lv-swap

    - id: mount-swap
      type: mount
      device: format-swap
      path: ""    # swap has no mount path
```

## User Data and SSH Keys

The identity section creates the primary user:

```yaml
identity:
  hostname: prod-server-01
  realname: Admin User
  username: admin
  # Hash generated with: openssl passwd -6 "SecurePassword123!"
  password: "$6$rounds=4096$YeWMpNsKJSAW6x4Y$..."
```

For SSH keys, the `ssh` section is cleaner:

```yaml
ssh:
  install-server: true
  authorized-keys:
    - "ssh-ed25519 AAAAC3... admin@workstation"
    - "ssh-rsa AAAAB3NzaC1yc2E... backup-key"
  allow-pw: false    # Disable password authentication
```

## Package Installation and Snaps

```yaml
# APT packages
packages:
  - nginx
  - postgresql-16
  - redis-server
  - python3-pip
  - docker.io

# Snap packages
snaps:
  - name: microk8s
    channel: 1.29/stable
    classic: true
  - name: helm
    classic: true
```

## Late Commands

Late commands run after all packages are installed but before reboot. They run in the installed system's context:

```yaml
late-commands:
  # Commands run with curtin in-target (chroot into installed system)
  - curtin in-target -- bash -c "ufw allow ssh && ufw --force enable"
  - curtin in-target -- systemctl enable nginx
  - curtin in-target -- systemctl enable fail2ban

  # Commands run in the installer environment (can access the live system)
  - "echo 'net.ipv4.ip_forward=1' >> /target/etc/sysctl.conf"

  # Download and run a setup script
  - curtin in-target -- bash -c "curl -sSL https://raw.githubusercontent.com/myorg/infra/main/setup.sh | bash"
```

## Early Commands

Early commands run before storage configuration - useful for loading kernel modules or preparing storage:

```yaml
early-commands:
  # Load a kernel module needed for specialized storage
  - modprobe nvme
  # Wipe a specific disk
  - wipefs -a /dev/sdb
```

## Serving Autoinstall Config via HTTP

The simplest way to provide the autoinstall config to the installer is via HTTP.

Host the file on any web server reachable from the installing machine:

```bash
# Start a simple HTTP server on your workstation
python3 -m http.server 8080 --directory /path/to/autoinstall/

# Verify it is reachable
curl http://192.168.1.10:8080/autoinstall.yaml
```

At the Ubuntu Server installer's GRUB menu, press `e` to edit the boot entry and append to the linux line:

```text
autoinstall ds=nocloud-net;s=http://192.168.1.10:8080/
```

The `ds=nocloud-net;s=` part tells cloud-init where to find the config. The server must serve both `user-data` (your autoinstall config) and `meta-data` files at that URL:

```bash
# Directory structure for nocloud-net
/path/to/autoinstall/
  user-data    # Your autoinstall.yaml content (must start with #cloud-config)
  meta-data    # Can be empty or contain instance-id
```

The `user-data` file wraps the autoinstall config in cloud-init format:

```yaml
#cloud-config
autoinstall:
  version: 1
  locale: en_US.UTF-8
  keyboard:
    layout: us
  # ... rest of autoinstall config
```

## Embedding in a Custom ISO

For environments without network access to a server, embed the config in the ISO:

```bash
# Install required tools
sudo apt install xorriso isolinux

# Extract the Ubuntu ISO
xorriso -osirrox on -indev ubuntu-24.04-live-server-amd64.iso -extract / /tmp/ubuntu-iso

# Create nocloud directory with your config
mkdir -p /tmp/ubuntu-iso/nocloud
cp user-data /tmp/ubuntu-iso/nocloud/
touch /tmp/ubuntu-iso/nocloud/meta-data

# Modify GRUB to boot with autoinstall
# Edit /tmp/ubuntu-iso/boot/grub/grub.cfg
# Add to the linux line: autoinstall ds=nocloud;s=/cdrom/nocloud/

# Repack the ISO
xorriso -as mkisofs -r -V "Ubuntu 24.04 AutoInstall" \
    -cache-inodes -J -l \
    -b isolinux/isolinux.bin \
    -c isolinux/boot.cat \
    -no-emul-boot -boot-load-size 4 -boot-info-table \
    -eltorito-alt-boot \
    -e boot/grub/efi.img \
    -no-emul-boot \
    -isohybrid-gpt-basdat \
    -o ubuntu-autoinstall.iso /tmp/ubuntu-iso
```

## Testing with QEMU

Before deploying to real hardware, test the autoinstall config in QEMU:

```bash
# Create a test disk
qemu-img create -f qcow2 test-disk.qcow2 40G

# Run autoinstall (non-graphical, serving config locally)
qemu-system-x86_64 \
    -enable-kvm \
    -m 2048 \
    -smp 2 \
    -drive file=test-disk.qcow2,if=virtio \
    -cdrom ubuntu-24.04-live-server-amd64.iso \
    -kernel /tmp/ubuntu-iso/casper/vmlinuz \
    -initrd /tmp/ubuntu-iso/casper/initrd \
    -append "autoinstall ds=nocloud-net;s=http://192.168.1.10:8080/ quiet" \
    -nographic
```

## Troubleshooting

```bash
# View autoinstall logs on the installed system
sudo cat /var/log/installer/autoinstall-user-data
sudo cat /var/log/installer/curtin-install.log

# Check what the installer actually applied
sudo cat /var/log/installer/subiquity-server-debug.log.gz | zcat | tail -100

# Validate autoinstall YAML syntax
python3 -c "import yaml; yaml.safe_load(open('autoinstall.yaml'))"
```

Autoinstall combined with a network config server or custom ISO gives you a powerful, maintainable automation pipeline that works equally well for a dozen machines in a rack or hundreds of nodes in a datacenter.
