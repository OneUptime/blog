# How to Configure Samba with CephFS Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Samba, CephFS, File Sharing

Description: Learn how to configure Samba to use CephFS as a backend file system using the VFS ceph module for direct kernel-bypass access.

---

## Samba with CephFS VFS Module

Samba can access CephFS using the `vfs_ceph` module, which communicates directly with the Ceph client library (libcephfs) without going through the kernel FUSE mount. This provides better performance and avoids kernel buffer cache overhead.

## Installing Required Packages

Install Samba with CephFS support:

```bash
# RHEL/CentOS
dnf install -y samba samba-vfs-cephfs ceph-common

# Ubuntu/Debian
apt-get install -y samba samba-vfs-modules ceph-common
```

## Configuring Ceph Authentication for Samba

Create a dedicated Ceph user for Samba:

```bash
ceph auth get-or-create client.samba \
  mds 'allow rw path=/' \
  osd 'allow rw pool=cephfs_data' \
  mon 'allow r' \
  > /etc/ceph/ceph.client.samba.keyring

chmod 640 /etc/ceph/ceph.client.samba.keyring
chown root:samba /etc/ceph/ceph.client.samba.keyring
```

## Configuring smb.conf

Edit `/etc/samba/smb.conf` to add the CephFS-backed share:

```ini
[global]
    workgroup = EXAMPLE
    server string = Ceph SMB Server
    netbios name = samba01
    security = user
    passdb backend = tdbsam
    log file = /var/log/samba/%m.log
    log level = 1

[cephshare]
    comment = CephFS Share
    path = /
    valid users = @smbusers
    browsable = yes
    writable = yes
    vfs objects = ceph
    ceph:config_file = /etc/ceph/ceph.conf
    ceph:user_id = samba
    kernel share modes = no
    posix locking = no
```

## Creating Samba Users

Add a system user and create a corresponding Samba user:

```bash
useradd -M -s /sbin/nologin smbuser1
smbpasswd -a smbuser1
groupadd smbusers
usermod -aG smbusers smbuser1
```

## Starting and Testing Samba

Enable and start the Samba services:

```bash
# RHEL/CentOS
systemctl enable --now smb nmb

# Ubuntu/Debian
systemctl enable --now smbd nmbd
```

Test the configuration:

```bash
testparm -s
```

Check that the share is accessible:

```bash
smbclient -L //localhost -U smbuser1
```

## Verifying CephFS VFS Module is Active

Confirm the VFS module is loaded when a connection is made:

```bash
smbstatus | grep ceph
```

Check Samba logs for VFS initialization:

```bash
grep "ceph" /var/log/samba/log.smbd | tail -20
```

## Performance Tuning

Optimize Samba for CephFS workloads by adjusting buffer settings:

```ini
[global]
    # Use SMB3 for best performance
    max protocol = SMB3
    # Increase SMB2/3 read and write buffer sizes
    smb2 max read = 8388608
    smb2 max write = 8388608
    smb2 max trans = 8388608
```

Apply settings and restart:

```bash
systemctl restart smb
```

## Summary

Configuring Samba with a CephFS backend using the `vfs_ceph` module provides a high-performance SMB gateway that bypasses the kernel FUSE layer. The setup requires a dedicated Ceph auth user, properly configured `smb.conf` with `vfs objects = ceph`, and Samba user accounts. This approach is well-suited for production file sharing workloads that require the scalability of CephFS with SMB client compatibility.
