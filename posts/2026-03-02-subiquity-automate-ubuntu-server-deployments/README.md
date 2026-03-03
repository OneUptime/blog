# How to Use Subiquity to Automate Ubuntu Server Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Subiquity, Automation, Deployment

Description: A practical guide to automating Ubuntu Server installations using Subiquity autoinstall, covering the YAML configuration format, cloud-init integration, and testing with virtual machines.

---

Manually stepping through the Ubuntu Server installer once is fine. Doing it for dozens of machines is not. Subiquity, the installer used in Ubuntu Server 20.04 and later, supports a feature called "autoinstall" that lets you define the entire installation in a YAML file and run completely unattended installs.

## How Subiquity Autoinstall Works

Autoinstall is Subiquity's answer to the old preseed system used by the classic Debian installer. The installer reads configuration from a YAML file provided either via:

- A cloud-init `user-data` file on an HTTP server
- A `autoinstall` parameter on the kernel command line pointing to a URL
- A file on an additional disk or USB labeled `CIDATA`

When the installer detects an autoinstall config, it proceeds without any user interaction. If any required configuration is missing, it stops and prompts rather than guessing.

## Basic Autoinstall YAML Structure

Create a file named `user-data`:

```yaml
#cloud-config
autoinstall:
  version: 1

  # Identity configuration
  identity:
    hostname: web-server-01
    username: deploy
    # Generate a hashed password with: openssl passwd -6 'yourpassword'
    password: "$6$examplehash..."

  # Locale and keyboard
  locale: en_US.UTF-8
  keyboard:
    layout: us

  # Network configuration (Netplan format)
  network:
    version: 2
    ethernets:
      ens3:
        dhcp4: true

  # Storage layout
  storage:
    layout:
      name: lvm

  # Package installation
  packages:
    - git
    - curl
    - vim
    - fail2ban
    - ufw

  # SSH configuration
  ssh:
    install-server: true
    authorized-keys:
      - "ssh-ed25519 AAAA... user@hostname"
    allow-pw: false

  # Commands to run after installation
  late-commands:
    - curtin in-target --target=/target -- systemctl enable ufw
    - curtin in-target --target=/target -- ufw allow 22/tcp
    - curtin in-target --target=/target -- ufw --force enable
```

## Storage Configuration Options

The storage section is the most complex part. Several preset layouts are available:

### Simple LVM (Recommended for Most Cases)

```yaml
storage:
  layout:
    name: lvm
    # Optional: leave 20% of VG unallocated for snapshots
    sizing-policy: scaled
```

### Direct ext4 (No LVM)

```yaml
storage:
  layout:
    name: direct
```

### Full Disk Encryption with LVM

```yaml
storage:
  layout:
    name: lvm
    match:
      size: largest
  config:
    - type: disk
      id: disk0
      ptable: gpt
      wipe: superblock-recursive
    - type: partition
      id: partition-efi
      device: disk0
      size: 1G
      flag: boot
      grub_device: true
    - type: partition
      id: partition-boot
      device: disk0
      size: 2G
    - type: partition
      id: partition-luks
      device: disk0
      size: -1  # Use remaining space
    - type: format
      id: format-efi
      volume: partition-efi
      fstype: fat32
    - type: format
      id: format-boot
      volume: partition-boot
      fstype: ext4
    - type: dm_crypt
      id: dm-crypt0
      volume: partition-luks
      key: "your-luks-passphrase"
    - type: lvm_volgroup
      id: vg0
      name: ubuntu-vg
      devices:
        - dm-crypt0
    - type: lvm_partition
      id: lv-root
      name: ubuntu-lv
      volgroup: vg0
      size: -1
    - type: format
      id: format-root
      volume: lv-root
      fstype: ext4
    - type: mount
      id: mount-root
      device: format-root
      path: /
    - type: mount
      id: mount-boot
      device: format-boot
      path: /boot
    - type: mount
      id: mount-efi
      device: format-efi
      path: /boot/efi
```

## Generating Password Hashes

The identity section requires a pre-hashed password:

```bash
# Generate a SHA-512 hashed password
openssl passwd -6 'your-secure-password'

# Or using Python
python3 -c "import crypt; print(crypt.crypt('your-password', crypt.mksalt(crypt.METHOD_SHA512)))"
```

Never store plaintext passwords in autoinstall files. Use the hash.

## Serving the Config via HTTP

The installer needs to fetch the config file. A simple approach is serving it with Python:

```bash
# Create a directory structure
mkdir -p autoinstall-server
cd autoinstall-server

# Place your user-data file here
# Also create an empty meta-data file (required by cloud-init)
touch meta-data

# Serve with Python
python3 -m http.server 8080
```

The kernel command line parameter to pass to the installer:

```text
autoinstall ds=nocloud-net;s=http://192.168.1.100:8080/
```

The trailing slash on the URL is important.

## Providing Config via a CIDATA USB Drive

For environments without network access during boot:

```bash
# Create a disk image
dd if=/dev/zero of=cidata.img bs=1M count=10
mkfs.vfat -n CIDATA cidata.img

# Mount and copy files
sudo mkdir -p /mnt/cidata
sudo mount cidata.img /mnt/cidata
sudo cp user-data /mnt/cidata/
sudo cp meta-data /mnt/cidata/
sudo umount /mnt/cidata

# Write to a USB drive
sudo dd if=cidata.img of=/dev/sdX bs=1M status=progress
```

The installer detects the CIDATA label and reads the config automatically.

## Adding Late-Commands for Post-Install Configuration

The `late-commands` section runs commands in the installed system using `curtin in-target`:

```yaml
late-commands:
  # Install additional software
  - curtin in-target --target=/target -- apt install -y nginx

  # Create directories and set permissions
  - mkdir -p /target/var/www/html/app
  - curtin in-target --target=/target -- chown -R www-data:www-data /var/www/html

  # Write a configuration file
  - |
    cat > /target/etc/motd << 'EOF'
    Welcome to web-server-01
    Managed server - do not modify manually
    EOF

  # Enable and configure services
  - curtin in-target --target=/target -- systemctl enable nginx
  - curtin in-target --target=/target -- systemctl enable fail2ban
```

Commands prefixed with `curtin in-target --target=/target --` run inside the newly installed system's environment (chroot). Commands without the prefix run in the installer's environment.

## Testing with Virtual Machines

Before deploying to real hardware, test your autoinstall config in a VM:

```bash
# Install QEMU/KVM
sudo apt install qemu-kvm libvirt-daemon-system virtinst

# Create a test disk
qemu-img create -f qcow2 test-ubuntu.qcow2 20G

# Boot the installer with autoinstall
# The -kernel/-append approach injects the kernel parameter directly
virt-install \
  --name test-ubuntu \
  --memory 2048 \
  --vcpus 2 \
  --disk path=test-ubuntu.qcow2,size=20 \
  --cdrom ubuntu-24.04-live-server-amd64.iso \
  --os-variant ubuntu24.04 \
  --location ubuntu-24.04-live-server-amd64.iso,kernel=casper/vmlinuz,initrd=casper/initrd \
  --extra-args "autoinstall ds=nocloud-net;s=http://192.168.122.1:8080/" \
  --noautoconsole
```

Monitor the installation:

```bash
virsh console test-ubuntu
```

## Integrating with PXE Boot

For large-scale bare-metal provisioning, combine autoinstall with PXE:

```text
# GRUB PXE menu entry
menuentry "Ubuntu 24.04 Autoinstall" {
    set gfxpayload=keep
    linux /ubuntu-24.04/vmlinuz \
        root=/dev/ram0 \
        ramdisk_size=1500000 \
        ip=dhcp \
        url=http://pxe-server/ubuntu-24.04/ubuntu-24.04-live-server-amd64.iso \
        autoinstall \
        ds=nocloud-net;s=http://pxe-server/configs/web-server/
    initrd /ubuntu-24.04/initrd
}
```

Different machines can point to different config directories for customized installs.

## Validating Your Autoinstall YAML

Before running an install, validate the YAML syntax:

```bash
# Install yq for YAML validation
sudo apt install yq

# Check YAML syntax
yq eval user-data

# Subiquity also provides a validation tool
pip3 install curtin
curtin schema --schema autoinstall user-data
```

## Debugging Failed Autoinstalls

If an autoinstall fails, check the installer logs:

```bash
# From a live environment or after boot
cat /var/log/installer/autoinstall-user-data
cat /var/log/installer/curtin-install.log
cat /var/log/installer/subiquity-server-debug.log
```

The `autoinstall-user-data` file shows the effective config the installer used, including defaults. Comparing this with your intended config reveals what the installer interpreted differently.

## Secrets Management

Avoid hardcoding credentials in autoinstall files that get committed to version control. Options:

1. **Templating**: Use a script to substitute secrets at deploy time from environment variables
2. **Separate secrets file**: Serve the base config from git, but inject SSH keys and passwords from a secrets store
3. **Vault integration**: Have late-commands pull secrets from HashiCorp Vault or similar after first boot

```bash
# Example: template substitution at deploy time
sed "s/PLACEHOLDER_PASSWORD/$HASHED_PASSWORD/g" user-data.template > user-data
```

Subiquity autoinstall significantly reduces the time and error rate for provisioning servers. Once you have a working config, adding new machines becomes a matter of booting and waiting.
