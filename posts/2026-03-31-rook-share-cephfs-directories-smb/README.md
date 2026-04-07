# How to Share CephFS Directories via SMB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, SMB, CephFS, File Sharing

Description: Learn how to expose specific CephFS subdirectories as SMB shares with access controls, quotas, and user-level permissions.

---

## Planning Directory Shares

When sharing CephFS directories over SMB, plan your layout in advance. Common strategies include:

- One top-level share per department
- Per-user home directory shares
- Read-only archive shares with a writable working directory

## Creating CephFS Subvolumes for Sharing

Using subvolumes provides isolation and quota enforcement:

```bash
# Create a subvolume group for SMB shares
ceph fs subvolumegroup create cephfs smb-shares

# Create individual shares
ceph fs subvolume create cephfs marketing --group_name smb-shares --size 500G
ceph fs subvolume create cephfs engineering --group_name smb-shares --size 1T
ceph fs subvolume create cephfs archives --group_name smb-shares --size 2T

# Get the actual paths
ceph fs subvolume getpath cephfs marketing --group_name smb-shares
```

## Configuring Multiple Shares in smb.conf

Add each subvolume as a separate SMB share:

```ini
[marketing]
    comment = Marketing Department Files
    path = /volumes/smb-shares/marketing
    valid users = @marketing-team
    browsable = yes
    writable = yes
    create mask = 0664
    directory mask = 0775
    vfs objects = ceph
    ceph:config_file = /etc/ceph/ceph.conf
    ceph:user_id = samba
    kernel share modes = no

[engineering]
    comment = Engineering Files
    path = /volumes/smb-shares/engineering
    valid users = @engineering-team
    browsable = yes
    writable = yes
    create mask = 0664
    directory mask = 0775
    vfs objects = ceph
    ceph:config_file = /etc/ceph/ceph.conf
    ceph:user_id = samba
    kernel share modes = no

[archives]
    comment = Read-only Archives
    path = /volumes/smb-shares/archives
    valid users = @all-users
    browsable = yes
    writable = no
    read only = yes
    vfs objects = ceph
    ceph:config_file = /etc/ceph/ceph.conf
    ceph:user_id = samba
    kernel share modes = no
```

## Setting Up POSIX Permissions

Set proper POSIX ownership and permissions on each share directory:

```bash
# Set ownership for marketing share
chown root:marketing-team /mnt/cephfs/volumes/smb-shares/marketing

# Set permissions with setgid bit so new files inherit the group
chmod 2775 /mnt/cephfs/volumes/smb-shares/marketing
```

## Configuring User Groups

Create matching Linux groups and Samba users:

```bash
groupadd marketing-team
groupadd engineering-team
groupadd all-users

for user in alice bob charlie; do
  useradd -M -s /sbin/nologin $user
  smbpasswd -a $user
  usermod -aG marketing-team $user
  usermod -aG all-users $user
done
```

## Testing Share Access

Verify each share from a client:

```bash
smbclient //samba01/marketing -U alice
smbclient //samba01/archives -U alice
```

Check permissions are enforced:

```bash
smbclient //samba01/engineering -U alice
# Should fail - alice is not in engineering-team
```

## Applying CephFS Quotas

Set storage quotas on the subvolumes to limit share usage:

```bash
ceph fs subvolume resize cephfs marketing 600G --group_name smb-shares
ceph fs subvolume info cephfs marketing --group_name smb-shares | grep bytes_quota
```

## Summary

Sharing CephFS directories via SMB using subvolumes provides a clean separation between shares with independent quotas and POSIX permissions. Configuring each subvolume as a dedicated SMB share in `smb.conf` with appropriate `valid users` and `writable` settings gives fine-grained access control while keeping the configuration straightforward to manage.
