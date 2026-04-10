# How to Configure Guest Access for Ceph SMB Shares

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, SMB, Guest Access, Security

Description: Learn how to configure guest and anonymous access for specific Ceph SMB shares while maintaining security controls for sensitive directories.

---

## When to Use Guest Access

Guest access allows connections to an SMB share without requiring a username or password. Appropriate use cases include:
- Public read-only documentation shares
- Internal download servers
- Anonymous software distribution shares

Guest access should never be used for shares containing sensitive data.

## Configuring the Guest Account

Ensure Samba has a valid guest account (typically `nobody`):

```ini
[global]
    guest account = nobody
    map to guest = Bad User
```

The `map to guest = Bad User` directive maps failed authentication attempts to the guest account, allowing anonymous access. Use `map to guest = Never` to disable guest access globally.

## Creating a Read-Only Guest Share

Configure a share that allows guest read-only access:

```ini
[public]
    comment = Public Downloads
    path = /mnt/cephfs/volumes/public-share
    guest ok = yes
    read only = yes
    browsable = yes
    create mask = 0644
    directory mask = 0755
```

Set proper filesystem permissions so the `nobody` user can read:

```bash
chown nobody:nobody /mnt/cephfs/volumes/public-share
chmod 755 /mnt/cephfs/volumes/public-share
```

## Creating a Writable Guest Share

For internal drop-box style shares where anyone can write:

```ini
[dropbox]
    comment = Anonymous Upload
    path = /mnt/cephfs/volumes/dropbox
    guest ok = yes
    writable = yes
    create mask = 0600
    directory mask = 0700
    force user = dropbox-user
    force group = dropbox-group
```

The `force user` directive ensures all guest writes are owned by a specific system user, preventing `nobody` from owning files:

```bash
useradd -M -s /sbin/nologin dropbox-user
groupadd dropbox-group
chown dropbox-user:dropbox-group /mnt/cephfs/volumes/dropbox
chmod 1777 /mnt/cephfs/volumes/dropbox  # Sticky bit prevents deletion of others' files
```

## Restricting Guest Access by Network

Limit guest access to specific subnets:

```ini
[public]
    guest ok = yes
    hosts allow = 10.0.0.0/24 192.168.1.0/24
    hosts deny = 0.0.0.0/0
```

## Testing Guest Access

Connect as guest from Linux:

```bash
smbclient //samba01/public -N
```

The `-N` flag means no password. Verify read works but write fails for read-only shares:

```bash
smbclient //samba01/public -N -c "ls; put /etc/hostname test.txt"
# Should show files but fail on put
```

Connect from Windows without credentials:

```powershell
net use X: \\samba01\public /user:"" ""
dir X:
```

## Auditing Guest Access

Log guest connections to track anonymous access:

```ini
[global]
    log level = 1
    log file = /var/log/samba/%m.log
    max log size = 50000
```

Monitor guest sessions:

```bash
smbstatus -S | grep -i guest
```

Or check Samba logs for guest connections:

```bash
grep "guest" /var/log/samba/log.smbd | grep "connect" | tail -20
```

## Summary

Configuring guest access for Ceph SMB shares requires enabling the guest account in Samba, marking specific shares with `guest ok = yes`, and setting appropriate filesystem permissions for the `nobody` or forced user. Restricting guest access by subnet and using `force user` for writable guest shares provides essential security controls while maintaining the convenience of anonymous access for appropriate use cases.
