# How to Recover Lost Root Password on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, System Recovery, Administration, Authentication

Description: Step-by-step procedures for recovering or resetting a lost root or sudo user password on Ubuntu using recovery mode, GRUB, and single-user mode techniques.

---

Losing access to the root password or the only sudo user's password on an Ubuntu system is a common emergency. The recovery process depends on what you still have access to and whether the system uses full disk encryption. This guide covers the most common scenarios.

## Important Security Note

These recovery methods require physical access to the machine (or access to the hypervisor console for VMs). This is intentional - the ability to reset a root password requires physical security. If an attacker has physical access to an unencrypted machine, disk encryption is the only effective protection. Without it, password recovery is possible by anyone with physical access.

## Scenario 1: You Have Another sudo User

If you forgot the root password but have another user with sudo access:

```bash
# Log in as the other sudo user
# Reset root password
sudo passwd root

# Reset another user's password
sudo passwd username

# Unlock a locked account
sudo passwd -u username

# Create a new sudo user if needed
sudo useradd -m -s /bin/bash recovery-user
sudo passwd recovery-user
sudo usermod -aG sudo recovery-user
```

## Scenario 2: Recovery Mode (Recommended Method)

Ubuntu's recovery mode provides a root shell without knowing any passwords. This is the standard approach for lost passwords.

### Step 1: Access GRUB

Restart the system. When the system starts booting:

- On physical hardware: Hold `Shift` immediately after the BIOS/UEFI splash screen
- On UEFI systems: Hold `Esc` or try `Shift`
- In VMs: Most hypervisors have an option to send the Shift key or access console at boot

The GRUB menu should appear. If it doesn't, try repeatedly pressing `Esc` during boot.

### Step 2: Enter Recovery Mode

```text
Ubuntu                                      ← Normal boot
Advanced options for Ubuntu                 ← Select this
Ubuntu, with Linux 6.5.0-21-generic (recovery mode)  ← Select recovery kernel
```

### Step 3: Use the Recovery Menu

The recovery menu offers several options:

```text
Recovery Menu:
  resume           - Resume normal boot
  clean            - Try to make free space
  dpkg             - Repair broken packages
  fsck             - Check all file systems
  grub             - Update grub bootloader
  network          - Enable networking
  root             - Drop to root shell prompt  ← Select this
  system-summary   - System summary
  users            - Manage user accounts and passwords
```

Select "root" for a root shell.

### Step 4: Remount Root Filesystem Read-Write

The recovery shell mounts the root filesystem read-only by default. You need write access to change passwords:

```bash
# Remount root filesystem as read-write
mount -o remount,rw /

# Verify it's now writable
touch /test-write && rm /test-write && echo "Writable"

# Now reset the password
passwd root
# Enter new password twice

# Reset a specific user's password
passwd username
```

### Step 5: Reboot

```bash
# Sync filesystem and reboot
sync
reboot
```

## Scenario 3: Editing GRUB Kernel Parameters

If the recovery mode option isn't available or accessible, edit the GRUB boot entry manually.

### Step 1: Access GRUB Menu

Same as above - hold Shift during boot to see GRUB.

### Step 2: Edit the Boot Entry

1. Select the Ubuntu boot entry (highlight it, don't press Enter)
2. Press `e` to edit the boot entry

You'll see the kernel command line, which looks something like:

```text
linux /boot/vmlinuz-6.5.0-21-generic root=/dev/mapper/ubuntu--vg-ubuntu--lv ro quiet splash $vt_handoff
```

### Step 3: Modify the Kernel Parameters

Navigate to the line starting with `linux` and find `ro quiet splash`.

Change `ro` to `rw` and add `init=/bin/bash` at the end of the line:

```text
linux /boot/vmlinuz-6.5.0-21-generic root=/dev/mapper/ubuntu--vg-ubuntu--lv rw quiet splash init=/bin/bash
```

Press `Ctrl+X` or `F10` to boot with the modified parameters.

### Step 4: Reset the Password

The system boots into a minimal bash shell as root:

```bash
# Verify root filesystem is writable
mount | grep "on / "
# Should show: ... (rw, ...) for the root mount

# Reset password
passwd root
# Or reset a specific user
passwd username

# Flush filesystem buffers and reboot
sync
exec /sbin/init
# Or: reboot -f
```

## Scenario 4: Using a Live USB

When other methods fail or GRUB is not accessible:

### Step 1: Boot from Live USB

Insert an Ubuntu live USB and boot from it (change boot order in BIOS if needed).

### Step 2: Mount the System

```bash
# Find your root partition
lsblk
# Look for your main disk, e.g., /dev/sda2 or an LVM volume

# Mount standard partition
sudo mkdir /mnt/system
sudo mount /dev/sda2 /mnt/system

# For LVM systems (common on Ubuntu server)
sudo vgscan
sudo vgchange -ay   # Activate LVM volumes
sudo lvdisplay      # Find the logical volume names
sudo mount /dev/ubuntu-vg/ubuntu-lv /mnt/system

# Mount required virtual filesystems for chroot
sudo mount --bind /dev /mnt/system/dev
sudo mount --bind /proc /mnt/system/proc
sudo mount --bind /sys /mnt/system/sys
sudo mount --bind /run /mnt/system/run
```

### Step 3: chroot and Reset

```bash
# Enter the installed system
sudo chroot /mnt/system

# Reset root password
passwd root

# Reset any user password
passwd username

# If you need to reset a forgotten username, list all users
cat /etc/passwd | grep -v "nologin\|false" | awk -F: '{print $1, $6}'

# Exit chroot
exit

# Unmount everything
sudo umount /mnt/system/dev
sudo umount /mnt/system/proc
sudo umount /mnt/system/sys
sudo umount /mnt/system/run
sudo umount /mnt/system
```

## Scenario 5: Systems with Full Disk Encryption (LUKS)

If your Ubuntu system uses LUKS encryption, you need the LUKS passphrase to unlock the disk before any of the above methods work. The LUKS passphrase is separate from the login password.

```bash
# From a live USB, unlock the encrypted volume
sudo cryptsetup luksOpen /dev/sda3 ubuntu-root

# Enter the LUKS passphrase when prompted

# After unlocking, proceed with LVM and chroot as above
sudo vgchange -ay
sudo mount /dev/ubuntu-vg/ubuntu-lv /mnt/system
# ... (rest of chroot procedure)
```

If you've also forgotten the LUKS passphrase, the encrypted data is not recoverable without it. This is the security guarantee of disk encryption.

## Preventing Lockout

After recovering access, prevent future lockouts:

```bash
# Ensure at least one user with sudo access is always configured
# Create a recovery user that's separate from service accounts
sudo useradd -m -s /bin/bash admin-recovery
sudo passwd admin-recovery
sudo usermod -aG sudo admin-recovery

# Store the password securely (password manager, encrypted vault)

# For servers, keep an emergency SSH key in authorized_keys
# Even if password access fails, key-based auth may still work
sudo mkdir -p /root/.ssh
sudo chmod 700 /root/.ssh

# Add your emergency public key
echo "ssh-ed25519 AAAA... emergency-key" | sudo tee -a /root/.ssh/authorized_keys
sudo chmod 600 /root/.ssh/authorized_keys
```

### Secure GRUB with a Password

To prevent unauthorized password resets via GRUB (on shared or accessible hardware):

```bash
# Generate a GRUB password hash
sudo grub-mkpasswd-pbkdf2
# Enter and confirm the desired GRUB password
# Copy the resulting hash

# Add GRUB password requirement
sudo nano /etc/grub.d/40_custom
```

```text
set superusers="grubadmin"
password_pbkdf2 grubadmin grub.pbkdf2.sha512.10000.<hash>
```

```bash
sudo update-grub
```

This requires a GRUB password to edit boot entries, preventing the kernel parameter modification technique without physical knowledge of the GRUB password.

## Summary

Lost password recovery on Ubuntu follows a clear hierarchy:

1. Another sudo user on the system - simplest fix
2. Recovery mode from GRUB - standard approach for Ubuntu
3. GRUB kernel parameter editing - when recovery mode isn't available
4. Live USB chroot - the most universal method that works in all cases
5. Full disk encryption - if LUKS passphrase is forgotten, data is unrecoverable

Always secure GRUB with a password on systems accessible to untrusted people, and maintain emergency authentication credentials (SSH keys or a recovery user's password) stored securely outside the system.
