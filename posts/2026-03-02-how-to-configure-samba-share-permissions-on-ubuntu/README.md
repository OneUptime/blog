# How to Configure Samba Share Permissions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, File Sharing, Permissions, Security

Description: Configure fine-grained Samba share permissions on Ubuntu using Linux filesystem permissions, smb.conf access controls, and Windows ACL integration.

---

Getting Samba permissions right is one of the more nuanced parts of setting up a file server. Samba permissions are a combination of two layers: Linux filesystem permissions (which Samba must respect) and Samba-specific access controls in `smb.conf`. When these are misaligned, users get confusing results - able to connect but not write, or able to write files but unable to delete them.

## How Samba Permission Layers Work

When a Windows client tries to access a file, Samba checks permissions in this order:

1. **Samba connection check** - is the user allowed to access this share at all? (controlled by `valid users`, `invalid users`, etc.)
2. **Samba write check** - is this a read-only share? Is the user in the `write list`?
3. **Linux filesystem check** - does the user's effective Linux UID/GID have permission on the actual file/directory?

All three layers must allow the operation. Having `read only = no` in Samba is useless if the Linux filesystem has the directory set to mode `755` and owned by root.

## Setting Up Linux Permissions for a Share

Before configuring Samba, ensure the Linux filesystem permissions are correct:

```bash
# Create the share directory
sudo mkdir -p /srv/samba/department

# Set ownership: owned by root, group access for the 'finance' group
sudo chown root:finance /srv/samba/department

# Set permissions:
# Owner (root): rwx
# Group (finance): rwx
# Others: ---
sudo chmod 770 /srv/samba/department

# Set the setgid bit so new files inherit the group
sudo chmod g+s /srv/samba/department

# Verify
ls -la /srv/samba/
# drwxrws--- root finance /srv/samba/department
```

## Samba Configuration for the Share

```bash
sudo nano /etc/samba/smb.conf
```

```ini
[Department]
   comment = Department Files
   path = /srv/samba/department

   # Who can connect to this share
   valid users = @finance

   # Who can write (subset of valid users)
   write list = @finance

   # No guest access
   guest ok = no

   # Not read-only (allow writes for write list members)
   read only = no

   # Permissions for new files and directories
   # 0664 = owner rw, group rw, others none
   create mask = 0660
   force create mode = 0660

   # 0775 = owner rwx, group rwx, others none
   directory mask = 0770
   force directory mode = 0770

   # Force all files to be owned by the finance group
   force group = finance

   # Inherit permissions from parent directory
   inherit permissions = yes
```

## Controlling Access with valid users, invalid users, and host restrictions

```ini
[Restricted]
   path = /srv/samba/restricted
   comment = Restricted Access Files

   # Only these specific users (not groups) can connect
   valid users = jsmith, bwilliams

   # These users are explicitly denied even if otherwise allowed
   invalid users = contractor1

   # Only accessible from specific IP ranges
   hosts allow = 192.168.1. 192.168.2.0/24
   hosts deny = ALL

   read only = no
   guest ok = no
```

## Read/Write Split Permissions

A common pattern: most users get read access, a subset gets write access:

```ini
[SharedReports]
   comment = Shared Reports - All Read, Managers Write
   path = /srv/samba/reports

   # All staff can read
   valid users = @staff
   read only = yes

   # Managers override the read-only restriction
   write list = @managers

   create mask = 0664
   directory mask = 0775
   force group = staff
```

## Recycle Bin Feature

Prevent accidental deletion by enabling the recycle bin VFS module:

```ini
[Department]
   path = /srv/samba/department
   # ... other settings ...

   # Enable recycle bin
   vfs objects = recycle
   recycle:repository = .recycle
   recycle:keeptree = yes
   recycle:versions = yes
   recycle:touch = yes
   recycle:touch_mtime = no
   recycle:maxsize = 0
   recycle:exclude = *.tmp, *.temp
   recycle:exclude_dir = /tmp, /temp
```

Files deleted by Windows clients go to `/srv/samba/department/.recycle/username/` instead of being permanently deleted.

## Audit Logging

Track who accesses and modifies files:

```ini
[Sensitive]
   path = /srv/samba/sensitive
   # ... other settings ...

   # Enable full audit logging
   vfs objects = full_audit
   full_audit:prefix = %U|%I|%m|%S
   full_audit:success = mkdir rmdir read write rename unlink
   full_audit:failure = connect
   full_audit:facility = LOCAL5
   full_audit:priority = NOTICE
```

Configure syslog to capture the audit events:

```bash
sudo nano /etc/rsyslog.d/samba-audit.conf
```

```
# Log Samba audit events to a separate file
local5.notice    /var/log/samba/audit.log
```

```bash
sudo systemctl restart rsyslog
```

## Windows ACL Support with VFS ACL Module

For full Windows ACL compatibility (as opposed to mapping to Unix permissions):

```ini
[WindowsACLs]
   path = /srv/samba/windows-acls
   comment = Share with Windows ACL support

   # Use the ACL VFS module
   vfs objects = acl_xattr
   map acl inherit = yes
   store dos attributes = yes

   # Required for Windows ACL support
   acl group control = yes

   # Disable Samba's internal permission mapping
   # (Windows ACLs take precedence)
   nt acl support = yes
```

Enable extended attributes on the filesystem:

```bash
# For ext4
sudo tune2fs -l /dev/sda1 | grep "Default mount options"
# Add 'user_xattr' if not present
sudo nano /etc/fstab
# Change options to include: defaults,user_xattr,acl
sudo mount -o remount /srv
```

## Setting Per-User Home Shares

```ini
# This share maps each user to their own directory
[homes]
   comment = %U's Home Directory
   browsable = no
   writable = yes
   valid users = %S
   path = /home/samba/%S
   create mask = 0700
   directory mask = 0700
```

Create a base directory for home shares:

```bash
sudo mkdir -p /home/samba

# When each user connects, Samba creates their directory
# Optionally pre-create for existing users:
for user in jsmith bwilliams; do
    sudo mkdir -p /home/samba/$user
    sudo chown $user:$user /home/samba/$user
    sudo chmod 700 /home/samba/$user
done
```

## Testing Permissions

```bash
# Test as a Samba user via smbclient
smbclient //localhost/Department -U jsmith

# In smbclient, test operations
smb: \> ls
smb: \> put /etc/hostname test-upload.txt
smb: \> del test-upload.txt
smb: \> mkdir testdir
smb: \> rmdir testdir

# Check Linux filesystem permissions directly
sudo -u jsmith ls -la /srv/samba/department/
sudo -u jsmith touch /srv/samba/department/testfile
sudo -u jsmith rm /srv/samba/department/testfile
```

## Common Permission Problems and Fixes

### User Can Connect but Cannot Create Files

```bash
# Check Linux permissions
ls -la /srv/samba/department/
# If owned by root and not group-writable:

# Fix group ownership and permissions
sudo chown root:finance /srv/samba/department/
sudo chmod 2775 /srv/samba/department/

# Verify user is in the correct group
id jsmith | grep finance
```

### Files Created with Wrong Permissions

```bash
# If files are created as 0644 but should be 0660:
# Add to smb.conf share section:
# force create mode = 0660
# create mask = 0660
```

### Cannot Delete Files Created by Others

```bash
# If file deletion requires ownership matching:
# Enable 'store dos attributes' for Windows-style delete behavior
# Or set sticky bit to prevent others from deleting:
# chmod +t /srv/samba/shared/  (sticky bit)
# Note: sticky bit means only owner can delete their own files
```

### Read-Only Mount Despite Configuration

```bash
# Check if the filesystem itself is mounted read-only
mount | grep /srv/samba
# If 'ro' appears, remount as read-write

# Check smb.conf - are there conflicting read only settings?
sudo testparm | grep "read only"
```

## Checking Active Connections and Locks

```bash
# See who is connected to which share
sudo smbstatus -S

# See open files and byte-range locks
sudo smbstatus -L

# Disconnect a specific user
# Find their PID from smbstatus, then:
sudo kill <pid>
```

Understanding the interplay between Linux filesystem permissions and Samba's share-level controls is key to getting file server permissions right. Start with correct Linux ownership and mode bits, then use Samba's directives to further restrict or enable access on top of that foundation.
