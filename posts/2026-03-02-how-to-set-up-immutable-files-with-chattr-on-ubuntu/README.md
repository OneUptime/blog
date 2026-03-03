# How to Set Up Immutable Files with chattr on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Hardening, Filesystem, System Administration

Description: Guide to using chattr to set immutable and append-only attributes on files and directories in Ubuntu, protecting critical system files from modification even by root.

---

The `chattr` command modifies extended filesystem attributes on Linux ext2/ext3/ext4, XFS, and Btrfs filesystems. The most powerful attribute is the immutable flag (`+i`), which prevents a file from being modified, renamed, deleted, or linked - even by the root user. This is not a standard permission control; it operates at the filesystem level below Unix permissions.

For security hardening, immutable attributes protect critical configuration files from tampering. If an attacker gains root access, they cannot easily modify system binaries, log files, or configuration files that have the immutable bit set. They first need to clear the attribute, which is a detectable action.

## How chattr Attributes Work

The key attributes for security purposes:

- **`i` (immutable)**: File cannot be modified, deleted, renamed, or linked. No write operations succeed. Even root gets "Operation not permitted".
- **`a` (append-only)**: File can only be opened for appending. Existing content cannot be modified or truncated. Ideal for log files.
- **`u` (undeletable)**: When file is deleted, its contents are saved, allowing recovery.
- **`s` (secure deletion)**: When deleted, blocks are zeroed out.

These attributes are stored in the inode and are independent of file permissions. A file can be mode 000 (no permissions for anyone) but still be modifiable if the immutable bit is not set.

## Installing chattr

`chattr` is part of the `e2fsprogs` package, installed by default on Ubuntu:

```bash
# Verify chattr is available
which chattr
# /usr/bin/chattr

# Check the version
chattr --version
```

## Basic chattr Usage

```bash
# Set the immutable attribute on a file
sudo chattr +i /etc/resolv.conf

# Remove the immutable attribute
sudo chattr -i /etc/resolv.conf

# Set append-only attribute on a log file
sudo chattr +a /var/log/auth.log

# Set multiple attributes at once
sudo chattr +ia /important/file.conf

# Set attribute recursively on a directory
sudo chattr -R +i /etc/ssh/

# View current attributes with lsattr
lsattr /etc/resolv.conf
# ----i---------e---- /etc/resolv.conf
```

### Understanding lsattr Output

The `lsattr` command shows file attributes as a sequence of flags. The position of the letter indicates the attribute:

```bash
lsattr /etc/passwd
# ----i---------e---- /etc/passwd

# The 'i' in position 5 means immutable is set
# The 'e' is the extent format attribute (normal for ext4)
```

## Protecting Critical System Files

### Configuration Files

Files that should not change after initial setup are good candidates for immutable protection:

```bash
# Protect SSH host keys (these should never change on a stable server)
sudo chattr +i /etc/ssh/ssh_host_*_key
sudo chattr +i /etc/ssh/ssh_host_*_key.pub

# Protect SSH daemon configuration
sudo chattr +i /etc/ssh/sshd_config

# Protect PAM configuration
sudo chattr +i /etc/pam.d/common-auth
sudo chattr +i /etc/pam.d/common-password
sudo chattr +i /etc/pam.d/sshd

# Protect sudoers
sudo chattr +i /etc/sudoers

# Protect hosts file
sudo chattr +i /etc/hosts

# Protect cron access control files
sudo chattr +i /etc/cron.allow
sudo chattr +i /etc/at.allow
```

### User Account Files

```bash
# Protect the password and shadow files
# WARNING: setting +i on these means passwd/adduser/etc will fail
# Only do this if the system has no local user management
sudo chattr +i /etc/passwd
sudo chattr +i /etc/shadow
sudo chattr +i /etc/group
sudo chattr +i /etc/gshadow
```

**Caution**: Setting immutable on these files means any operation that changes users - including password changes - will fail with "Operation not permitted". Only do this on locked-down systems where you have another way to manage user changes.

## Append-Only for Log Files

The append-only attribute is ideal for logs - processes can add new lines, but existing content cannot be modified or truncated. This prevents an attacker from deleting their tracks:

```bash
# Set append-only on key log files
sudo chattr +a /var/log/auth.log
sudo chattr +a /var/log/syslog
sudo chattr +a /var/log/kern.log

# Verify
lsattr /var/log/auth.log
# -----a--------e---- /var/log/auth.log

# Test: truncation should fail
sudo truncate -s 0 /var/log/auth.log
# Output: truncate: cannot open '/var/log/auth.log' for writing: Operation not permitted
```

**Important**: The append-only flag conflicts with log rotation, which needs to truncate or move log files. Coordinate with your log rotation configuration:

```bash
# For logrotate to work with append-only logs, it needs to remove the attribute first
sudo nano /etc/logrotate.d/rsyslog
```

Add prerotate and postrotate scripts:

```text
/var/log/syslog
{
    rotate 7
    daily
    compress
    missingok
    notifempty
    prerotate
        chattr -a /var/log/syslog
    endscript
    postrotate
        chattr +a /var/log/syslog
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}
```

## Protecting Directories

Setting the immutable attribute on a directory prevents:
- Creating new files in it
- Renaming files within it
- Deleting files from it (even if the files themselves are writable)
- Adding or removing hard links

```bash
# Make /etc/cron.d immutable (prevents new cron jobs being added)
sudo chattr +i /etc/cron.d

# Protect sensitive directories
sudo chattr +i /etc/sudoers.d
sudo chattr +i /etc/pam.d
```

## Using chattr in a Security Hardening Script

For consistent application across a server:

```bash
sudo tee /usr/local/sbin/apply-immutable-hardening <<'SCRIPT'
#!/bin/bash
# Apply immutable attributes to critical system files
# Run after initial system configuration is complete

set -euo pipefail

echo "Applying immutable file attributes..."

# SSH configuration
chattr +i /etc/ssh/sshd_config 2>/dev/null && echo "Protected: sshd_config" || echo "Skip: sshd_config"
chattr +i /etc/ssh/ssh_host_*_key 2>/dev/null && echo "Protected: SSH host keys"
chattr +i /etc/ssh/ssh_host_*_key.pub 2>/dev/null

# PAM configuration
for f in common-auth common-password common-account common-session; do
    chattr +i /etc/pam.d/$f 2>/dev/null && echo "Protected: pam.d/$f"
done

# Access control files
[ -f /etc/cron.allow ] && chattr +i /etc/cron.allow && echo "Protected: cron.allow"
[ -f /etc/at.allow ] && chattr +i /etc/at.allow && echo "Protected: at.allow"

# Network configuration
chattr +i /etc/hosts 2>/dev/null && echo "Protected: /etc/hosts"

echo "Done. Use 'chattr -i <file>' to make changes when needed."
SCRIPT

sudo chmod 750 /usr/local/sbin/apply-immutable-hardening
sudo /usr/local/sbin/apply-immutable-hardening
```

## Auditing for Changed Attributes

Detect if someone has removed immutable flags (which is itself suspicious):

```bash
# Save current attribute state to a baseline
sudo lsattr -R /etc/ 2>/dev/null > /root/baseline-attributes.txt

# Check for changes compared to baseline
sudo lsattr -R /etc/ 2>/dev/null | diff /root/baseline-attributes.txt -

# Or use aide/tripwire which can monitor extended attributes
sudo apt-get install -y aide
sudo aideinit
```

Configure the Linux audit daemon to detect chattr calls:

```bash
# Audit any use of chattr (clearing immutable flags would trigger this)
sudo auditctl -a exit,always -F arch=b64 -S ioctl \
  -F a1=0x40086601 -k immutable-change
# Note: 0x40086601 is the ioctl code for FS_IOC_SETFLAGS

# A simpler audit for the chattr binary
sudo auditctl -w /usr/bin/chattr -p x -k chattr-executed

# View audit events
sudo ausearch -k chattr-executed
```

## Working Around Immutable Attributes When You Need Changes

When you legitimately need to modify a protected file:

```bash
# Remove the immutable flag, make changes, re-apply
sudo chattr -i /etc/ssh/sshd_config
sudo nano /etc/ssh/sshd_config
sudo systemctl reload sshd
sudo chattr +i /etc/ssh/sshd_config

# Verify it is protected again
lsattr /etc/ssh/sshd_config
```

For upgrade scenarios where package managers need to update configuration files:

```bash
# Before running apt upgrade, temporarily remove immutable flags from files that packages may update
sudo chattr -i /etc/ssh/sshd_config
sudo apt-get upgrade
sudo chattr +i /etc/ssh/sshd_config
```

## Limitations to Understand

- **Physical access bypasses chattr**: Someone with physical access can mount the filesystem from a different OS and bypass these attributes entirely. Combine with full disk encryption for storage-level protection.
- **Does not protect against root in general**: A root-level attacker can remove the attribute with `chattr -i`. The goal is to slow them down and make the action auditable.
- **Only works on supported filesystems**: Works on ext2/3/4, XFS, Btrfs. Does not work on FAT, NFS, and some other filesystem types.
- **Package upgrades may need attribute removal**: Automated updates can fail if they need to modify protected files.

chattr is most valuable as a tripwire - the act of removing an immutable flag is detectable and unusual. A sophisticated attacker will clear it before making changes, but doing so requires knowledge of your hardening and generates audit events that can trigger alerts.
