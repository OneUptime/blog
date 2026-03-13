# How to Configure preseed for Unattended Ubuntu Deployment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Automation, Deployments, Infrastructure

Description: Create a preseed configuration file to automate Ubuntu installations with predefined partitioning, locale, user accounts, and package selection without operator input.

---

When deploying Ubuntu to bare metal servers or VMs at scale, answering installer questions manually is not practical. The Debian preseed mechanism lets you pre-answer every question the Ubuntu installer would ask, resulting in a fully automated installation that requires zero interaction.

## How Preseed Works

The Ubuntu installer (debian-installer, or d-i) reads a preseed file and uses the answers it contains rather than prompting the user. The preseed file can be:

- Included on the installation media itself
- Hosted on a web server and fetched during installation
- Loaded from a network share

Most automated deployment workflows use an HTTP-hosted preseed file, which is referenced in the boot parameters.

## Creating a Basic Preseed File

A preseed file is structured by topic. Here is a complete working example for Ubuntu 22.04:

```text
### Preseed configuration for Ubuntu 22.04 LTS ###

## Localization
d-i debian-installer/locale string en_US.UTF-8
d-i keyboard-configuration/xkb-keymap select us

## Network configuration
# Use DHCP during installation
d-i netcfg/choose_interface select auto
d-i netcfg/get_hostname string ubuntu-server
d-i netcfg/get_domain string example.com
# Disable the "weak wireless" warning
d-i netcfg/wireless_wep_key_good boolean true

## Mirror settings
d-i mirror/country string manual
d-i mirror/http/hostname string archive.ubuntu.com
d-i mirror/http/directory string /ubuntu
d-i mirror/http/proxy string

## Clock and timezone
d-i clock-setup/utc boolean true
d-i time/zone string UTC
d-i clock-setup/ntp boolean true

## User account setup
# Skip creating a root account; the sudo user serves as administrator
d-i passwd/root-login boolean false
d-i passwd/user-fullname string Deploy User
d-i passwd/username string deploy
# Generate a password hash with: openssl passwd -6 'your_password'
d-i passwd/user-password-crypted password $6$rounds=4096$...your_hash_here...
d-i passwd/user-default-groups string audio cdrom dip floppy video plugdev netdev sudo

## Disk partitioning
# Use entire disk with LVM
d-i partman-auto/disk string /dev/sda
d-i partman-auto/method string lvm
d-i partman-auto/purge_lvm_from_device boolean true
d-i partman-lvm/device_remove_lvm boolean true
d-i partman-md/device_remove_md boolean true
d-i partman-lvm/confirm boolean true
d-i partman-lvm/confirm_nooverwrite boolean true

# Partitioning recipe: boot, swap, root
d-i partman-auto/choose_recipe select atomic
# Alternatively, use a custom recipe (see below)

# Write changes to disks
d-i partman-partitioning/confirm_write_new_label boolean true
d-i partman/choose_partition select finish
d-i partman/confirm boolean true
d-i partman/confirm_nooverwrite boolean true

## Package selection
tasksel tasksel/first multiselect server, openssh-server
d-i pkgsel/include string curl git htop vim

# Disable automatic updates (manage via your config management tool)
d-i pkgsel/update-policy select none

## Bootloader installation
d-i grub-installer/only_debian boolean true
d-i grub-installer/with_other_os boolean true
d-i grub-installer/bootdev string /dev/sda

## Finish installation
d-i finish-install/reboot_in_progress note

## Post-installation script
d-i preseed/late_command string \
  in-target apt-get install -y python3 python3-pip; \
  in-target bash -c "echo 'deploy ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers.d/deploy"; \
  in-target chmod 0440 /etc/sudoers.d/deploy
```

## Custom Partitioning Recipes

The `atomic` recipe creates a single root partition. For more control, define a custom recipe:

```text
## Custom partitioning recipe
# Creates: 512MB /boot (ext4), 2GB swap, remaining space for /
d-i partman-auto/expert_recipe string   \
      custom-layout ::                  \
          512 512 512 ext4              \
                  $primary{ }           \
                  $bootable{ }          \
                  method{ format }      \
                  format{ }             \
                  use_filesystem{ }     \
                  filesystem{ ext4 }    \
                  mountpoint{ /boot } . \
          2048 2048 2048 linux-swap     \
                  method{ swap }        \
                  format{ }           . \
          10240 20480 -1 ext4           \
                  $primary{ }           \
                  method{ lvm }         \
                  device{ /dev/sda }    \
                  vg_name{ ubuntu-vg } .

# Then configure LVM logical volumes
d-i partman-auto-lvm/guided_size string max
```

## Hosting the Preseed File

The preseed file needs to be reachable from the installing machine. A simple Python HTTP server works well for testing:

```bash
# On a machine accessible from the network where you are installing
# Save your preseed file as ubuntu-preseed.cfg
python3 -m http.server 8080 --directory /path/to/preseed/files

# The URL will be: http://your-server-ip:8080/ubuntu-preseed.cfg
```

For production use, host it behind nginx:

```bash
sudo apt install -y nginx
sudo cp ubuntu-preseed.cfg /var/www/html/
sudo chmod 644 /var/www/html/ubuntu-preseed.cfg
```

## Configuring the Boot Loader for Preseed

When booting from the Ubuntu installation ISO, you need to add boot parameters to point to the preseed file.

### For BIOS-based Systems

At the GRUB or isolinux boot menu, press Tab (for isolinux) or E (for GRUB) to edit the boot command and append:

```text
auto=true priority=critical url=http://your-server:8080/ubuntu-preseed.cfg
```

### For UEFI Systems

The GRUB command line needs:

```text
auto=true priority=critical url=http://your-server:8080/ubuntu-preseed.cfg
```

### Custom ISO with Embedded Preseed

For fully hands-off deployment, embed the preseed file into a custom ISO:

```bash
# Install required tools
sudo apt install -y genisoimage xorriso

# Mount the original Ubuntu ISO
mkdir -p /tmp/ubuntu-iso
sudo mount -o loop ubuntu-22.04-live-server-amd64.iso /tmp/ubuntu-iso

# Copy the ISO contents to a working directory
mkdir -p ~/custom-ubuntu-iso
cp -rT /tmp/ubuntu-iso ~/custom-ubuntu-iso
sudo umount /tmp/ubuntu-iso

# Copy your preseed file into the ISO structure
cp ubuntu-preseed.cfg ~/custom-ubuntu-iso/preseed.cfg

# Modify the isolinux/grub configuration to load preseed automatically
# For BIOS boot (isolinux):
nano ~/custom-ubuntu-iso/isolinux/txt.cfg
```

Modify the default boot entry in `txt.cfg`:

```text
default live-install
label live-install
  menu label ^Install Ubuntu Server (automated)
  kernel /casper/vmlinuz
  append auto=true priority=critical file=/cdrom/preseed.cfg --- quiet
  initrd /casper/initrd
```

```bash
# Rebuild the ISO
xorriso -as mkisofs \
  -r -V "Ubuntu 22.04 Custom" \
  -J -joliet-long \
  -b isolinux/isolinux.bin \
  -c isolinux/boot.cat \
  -no-emul-boot -boot-load-size 4 -boot-info-table \
  -eltorito-alt-boot -e boot/grub/efi.img -no-emul-boot \
  -isohybrid-gpt-basdat \
  -o ~/ubuntu-22.04-custom.iso \
  ~/custom-ubuntu-iso/
```

## Generating Password Hashes

Never put plaintext passwords in preseed files. Generate the hash first:

```bash
# Generate a SHA-512 password hash
openssl passwd -6 'your_secure_password_here'

# The output looks like: $6$rounds=4096$salt$hash...
# Use this output in the preseed file for passwd/user-password-crypted
```

## Adding SSH Keys via Late Commands

The `late_command` section runs after the base installation completes and is the best place to add SSH keys and final configuration:

```text
d-i preseed/late_command string \
  in-target mkdir -p /home/deploy/.ssh; \
  in-target bash -c 'echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... user@host" > /home/deploy/.ssh/authorized_keys'; \
  in-target chown -R deploy:deploy /home/deploy/.ssh; \
  in-target chmod 700 /home/deploy/.ssh; \
  in-target chmod 600 /home/deploy/.ssh/authorized_keys
```

For more complex post-install scripts, download and run a script:

```text
d-i preseed/late_command string \
  wget -q -O /target/tmp/post-install.sh http://your-server/post-install.sh; \
  in-target bash /tmp/post-install.sh
```

## Testing with a Virtual Machine

Before deploying to physical hardware, test your preseed file in a VM:

```bash
# Install QEMU/KVM tools
sudo apt install -y qemu-kvm virtinst

# Create a test VM with the preseed URL
virt-install \
  --name ubuntu-preseed-test \
  --ram 2048 \
  --vcpus 2 \
  --disk size=20 \
  --cdrom ubuntu-22.04-live-server-amd64.iso \
  --os-variant ubuntu22.04 \
  --extra-args "auto=true priority=critical url=http://your-server:8080/ubuntu-preseed.cfg console=ttyS0" \
  --console pty,target_type=serial \
  --graphics none
```

Watch the console output to see the installer progress and catch any errors.

## Debugging Preseed Issues

If the installer still asks questions despite the preseed file, the question debconf key name may be wrong. To find the correct key:

```bash
# After a manual installation, debconf stores all answers
sudo debconf-get-selections --installer > installer-selections.txt
# Review this file to find the exact keys to use
```

Also check the install logs on the running system:

```bash
# Installer log captured on the installed system
sudo cat /var/log/installer/syslog | grep preseed
```

Preseed automation is well-suited for environments where you control the hardware and need consistent, repeatable Ubuntu deployments. For cloud environments, cloud-init is generally more appropriate since cloud providers handle the OS installation layer themselves.
