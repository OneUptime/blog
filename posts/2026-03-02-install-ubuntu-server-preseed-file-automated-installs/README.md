# How to Install Ubuntu Server Using a Preseed File for Automated Installs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Automation, Preseed, Installation, DevOps

Description: Learn how to use a preseed file to fully automate Ubuntu Server installations, eliminating manual prompts and enabling consistent, repeatable deployments.

---

When you need to install Ubuntu Server on multiple machines - whether in a bare-metal datacenter, a lab, or a PXE boot environment - doing it manually each time is not practical. Preseed files let you answer all the installer's questions in advance, producing a completely hands-off installation. This is the older Debian-style automation method that works with Ubuntu's traditional (non-live) installer. For Ubuntu 20.04 and 22.04 server (live) installers, Canonical introduced Autoinstall as the replacement, but preseed still works for Ubuntu's alternate images and netboot installers.

## What Is a Preseed File

A preseed file is a plain text file containing debconf answers that the Debian installer reads before or during installation. Each line specifies the package/module, the question key, the data type, and the answer:

```
d-i <module>/<key> <type> <value>
```

The installer uses these answers instead of prompting you, allowing a completely unattended install.

## Getting the Full Preseed Template

Canonical provides an example preseed file for Ubuntu. You can also dump the current debconf database on a running Ubuntu system to see what questions the installer would ask:

```bash
# On an existing Ubuntu system, dump debconf settings
sudo debconf-get-selections --installer > preseed.cfg
sudo debconf-get-selections >> preseed.cfg
```

## Building a Preseed File

Here is a complete, annotated preseed file for an Ubuntu Server installation:

```
# Localization
d-i debian-installer/locale string en_US.UTF-8
d-i localechooser/supported-locales multiselect en_US.UTF-8

# Keyboard
d-i keyboard-configuration/xkb-keymap select us

# Network - configure DHCP on the first interface
d-i netcfg/choose_interface select auto
d-i netcfg/get_hostname string ubuntu-server
d-i netcfg/get_domain string local

# Mirror settings
d-i mirror/country string manual
d-i mirror/http/hostname string archive.ubuntu.com
d-i mirror/http/directory string /ubuntu
d-i mirror/http/proxy string

# Clock and timezone
d-i clock-setup/utc boolean true
d-i time/zone string UTC
d-i clock-setup/ntp boolean true

# Partitioning - use entire disk with LVM
d-i partman-auto/method string lvm
d-i partman-lvm/device_remove_lvm boolean true
d-i partman-md/device_remove_md boolean true
d-i partman-lvm/confirm boolean true
d-i partman-lvm/confirm_nooverwrite boolean true

# LVM partitioning recipe
d-i partman-auto/choose_recipe select atomic

# Confirm partitioning without asking
d-i partman-partitioning/confirm_write_new_label boolean true
d-i partman/choose_partition select finish
d-i partman/confirm boolean true
d-i partman/confirm_nooverwrite boolean true

# User account setup
d-i passwd/user-fullname string Admin User
d-i passwd/username string admin
# Password hash (generate with: openssl passwd -6 "yourpassword")
d-i passwd/user-password-crypted password $6$rounds=4096$randomsalt$hashedpasswordhere
d-i passwd/user-uid string 1000
d-i passwd/user-default-groups string sudo

# Do not create a root account
d-i passwd/root-login boolean false

# Package selection - minimal server
tasksel tasksel/first multiselect server
d-i pkgsel/include string openssh-server curl wget

# Upgrade packages during install
d-i pkgsel/upgrade select full-upgrade

# Disable popularity contest
popularity-contest popularity-contest/participate boolean false

# GRUB boot loader
d-i grub-installer/only_debian boolean true
d-i grub-installer/bootdev string default

# Finish installation
d-i finish-install/reboot_in_progress note
```

## Generating a Password Hash

Never store plain-text passwords in preseed files. Generate a salted SHA-512 hash:

```bash
# Generate a password hash for use in preseed files
openssl passwd -6 "your-secure-password"
# Output: $6$<salt>$<hash>
# Copy the full output string into the passwd/user-password-crypted line
```

## Custom Partitioning Recipe

The `atomic` recipe puts everything on one partition. For servers, a custom recipe is better:

```
# Custom partitioning recipe: separate /boot, /, /var, /home
d-i partman-auto/method string lvm
d-i partman-auto/choose_recipe select custom-server

d-i partman-auto-lvm/guided_size string max
d-i partman-auto/expert_recipe string \
    custom-server ::                    \
        512 512 512 fat32               \
            $iflabel{ gpt }             \
            $reusemethod{ }             \
            method{ efi }               \
            format{ }                   \
        .                               \
        1024 1024 1024 ext4             \
            $defaultignore{ }           \
            $primary{ }                 \
            $bootable{ }               \
            method{ format }            \
            format{ }                   \
            use_filesystem{ }           \
            filesystem{ ext4 }          \
            mountpoint{ /boot }         \
        .                               \
        30720 30720 -1 ext4             \
            $lvmok{ }                   \
            method{ format }            \
            format{ }                   \
            use_filesystem{ }           \
            filesystem{ ext4 }          \
            mountpoint{ / }             \
        .                               \
        4096 4096 4096 linux-swap       \
            $lvmok{ }                   \
            method{ swap }              \
            format{ }                   \
        .
```

## Running Late Commands

The `preseed/late_command` directive runs a shell command after installation but before reboot. This is where you can do final configuration:

```
# Run commands after installation completes
d-i preseed/late_command string \
    in-target apt-get install -y unattended-upgrades; \
    in-target bash -c 'echo "PasswordAuthentication no" >> /etc/ssh/sshd_config'; \
    in-target mkdir -p /home/admin/.ssh; \
    in-target bash -c 'echo "ssh-ed25519 AAAAC3...yourkey..." > /home/admin/.ssh/authorized_keys'; \
    in-target chown -R admin:admin /home/admin/.ssh; \
    in-target chmod 700 /home/admin/.ssh; \
    in-target chmod 600 /home/admin/.ssh/authorized_keys
```

The `in-target` prefix runs commands in the chroot of the installed system rather than the installer environment.

## Hosting the Preseed File

The installer can fetch the preseed file from:

- An HTTP/HTTPS URL
- A local file on the installation media
- A PXE server

### HTTP Server Method

Host the file on any web server accessible from the installing machine:

```bash
# Serve preseed file with Python's built-in HTTP server
python3 -m http.server 8080
# Preseed URL: http://192.168.1.10:8080/preseed.cfg
```

### Embedding in the ISO

For air-gapped environments, embed the preseed file in the ISO:

```bash
# Extract ISO contents
mkdir -p /tmp/iso-work
sudo mount -o loop ubuntu.iso /mnt
cp -rT /mnt /tmp/iso-work
sudo umount /mnt

# Copy your preseed file
cp preseed.cfg /tmp/iso-work/

# Modify GRUB/isolinux boot parameters to point to the preseed file
# Edit /tmp/iso-work/boot/grub/grub.cfg or /tmp/iso-work/isolinux/txt.cfg
# Add: auto=true priority=critical preseed/file=/cdrom/preseed.cfg

# Repack the ISO
genisoimage -rational-rock -joliet -joliet-long \
    -no-emul-boot -boot-load-size 4 -boot-info-table \
    -eltorito-boot isolinux/isolinux.bin \
    -eltorito-catalog isolinux/boot.cat \
    -output ubuntu-preseeded.iso /tmp/iso-work
```

## Passing Preseed URL via Boot Parameters

At the GRUB menu during boot, press `e` to edit the boot entry and append:

```
auto=true priority=critical url=http://192.168.1.10:8080/preseed.cfg
```

Or configure this permanently in the GRUB configuration on your custom ISO.

## Testing the Preseed File

Always test in a VM before deploying to physical hardware:

```bash
# Test in VirtualBox using the command line
VBoxManage createvm --name "preseed-test" --ostype Ubuntu_64 --register
VBoxManage modifyvm "preseed-test" --memory 2048 --cpus 2
VBoxManage createhd --filename preseed-test.vdi --size 30000
VBoxManage storagectl "preseed-test" --name "SATA" --add sata
VBoxManage storageattach "preseed-test" --storagectl "SATA" --port 0 --type hdd --medium preseed-test.vdi
VBoxManage storageattach "preseed-test" --storagectl "SATA" --port 1 --type dvddrive --medium ubuntu-preseeded.iso
VBoxManage startvm "preseed-test"
```

## Debugging Preseed Issues

If the installer still shows prompts, the preseed answer may be missing or incorrect. During installation, you can switch to a shell on TTY2 (Alt+F2) and inspect:

```bash
# Check what debconf questions are pending
debconf-get-selections | grep d-i

# View installer log for errors
cat /var/log/syslog | grep -i preseed
```

Preseed automation is still widely used in environments with PXE boot infrastructure and older Ubuntu netboot installers. For Ubuntu 20.04+ live server installers, consider migrating to Autoinstall/cloud-init, which is Canonical's current recommended automation method for new deployments.
