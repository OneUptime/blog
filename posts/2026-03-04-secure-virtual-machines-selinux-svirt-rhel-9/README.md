# How to Secure Virtual Machines with SELinux sVirt on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, SELinux, sVirt, Security, Virtualization, Linux

Description: Learn how SELinux sVirt on RHEL 9 provides mandatory access control isolation between KVM virtual machines to prevent VM escape attacks.

---

SELinux sVirt provides mandatory access control (MAC) for KVM virtual machines on RHEL 9. It assigns unique security labels to each VM process and its resources, ensuring that even if a VM is compromised, it cannot access the files or processes of other VMs. This is an important defense-in-depth layer for multi-tenant virtualization environments.

## How sVirt Works

When a VM starts, libvirt automatically:

1. Assigns a unique SELinux category pair to the QEMU process (e.g., `svirt_t:s0:c123,c456`)
2. Labels the VM's disk images with matching categories
3. Labels other resources (sockets, devices) with matching categories

Because each VM gets a unique category, SELinux prevents one VM's process from accessing another VM's resources.

## Checking sVirt Status

Verify SELinux is enforcing:

```bash
getenforce
```

Check a running VM's SELinux context:

```bash
ps -eZ | grep qemu
```

Output:

```text
system_u:system_r:svirt_t:s0:c123,c456 12345 ? 00:05:30 qemu-kvm
```

Check disk image labels:

```bash
ls -lZ /var/lib/libvirt/images/
```

Output:

```text
system_u:object_r:svirt_image_t:s0:c123,c456 vm1.qcow2
system_u:object_r:svirt_image_t:s0:c789,c012 vm2.qcow2
```

Each VM has different category pairs, preventing cross-VM access.

## SELinux Contexts for Virtualization

| Context | Purpose |
|---------|---------|
| svirt_t | QEMU/KVM process type |
| svirt_image_t | VM disk image type |
| svirt_tcg_t | QEMU running without KVM (TCG mode) |
| virt_content_t | Content accessible to VMs |

## Static vs Dynamic Labeling

### Dynamic (Default)

libvirt automatically assigns unique categories at VM start and removes them at shutdown. This is the default and recommended approach.

### Static

You can assign fixed labels in the VM XML:

```xml
<seclabel type='static' model='selinux' relabel='yes'>
  <label>system_u:system_r:svirt_t:s0:c100,c200</label>
  <imagelabel>system_u:object_r:svirt_image_t:s0:c100,c200</imagelabel>
</seclabel>
```

Static labeling is useful when VMs need to share specific resources.

## Sharing Disk Images Between VMs

By default, sVirt prevents sharing. To allow shared access:

### Using virt_content_t

Label shared content:

```bash
sudo semanage fcontext -a -t virt_content_t "/shared/iso(/.*)?"
sudo restorecon -Rv /shared/iso
```

### Using svirt_image_t with Matching Categories

Give both VMs the same static label:

```xml
<!-- VM1 -->
<seclabel type='static' model='selinux' relabel='yes'>
  <label>system_u:system_r:svirt_t:s0:c100,c200</label>
</seclabel>

<!-- VM2 -->
<seclabel type='static' model='selinux' relabel='yes'>
  <label>system_u:system_r:svirt_t:s0:c100,c200</label>
</seclabel>
```

## Troubleshooting sVirt

### VM Fails to Start with Permission Denied

Check for SELinux denials:

```bash
sudo ausearch -m avc -ts recent | grep qemu
```

Common causes:

- Disk image in a non-standard location without proper labels
- NFS storage without proper SELinux configuration

### Fixing Disk Image Labels

```bash
sudo restorecon -v /var/lib/libvirt/images/vm1.qcow2
```

### Using Non-Standard Storage Paths

If you store images outside the default directory:

```bash
sudo semanage fcontext -a -t virt_image_t "/data/libvirt/images(/.*)?"
sudo restorecon -Rv /data/libvirt/images
```

### NFS Storage

Enable SELinux boolean for NFS-based VM images:

```bash
sudo setsebool -P virt_use_nfs on
```

### iSCSI Storage

```bash
sudo setsebool -P virt_use_samba on  # For CIFS
```

## Disabling sVirt (Not Recommended)

If you must disable sVirt for a specific VM:

```xml
<seclabel type='none' model='selinux'/>
```

This removes SELinux isolation for that VM and is not recommended for production.

## Useful SELinux Booleans for Virtualization

```bash
sudo getsebool -a | grep virt
```

Key booleans:

- `virt_use_nfs` - Allow VMs to use NFS storage
- `virt_use_samba` - Allow VMs to use Samba/CIFS storage
- `virt_sandbox_use_all_caps` - Allow sandboxed VMs full capabilities
- `virt_use_usb` - Allow VMs to use USB devices

## Summary

SELinux sVirt on RHEL 9 provides automatic, transparent security isolation between KVM virtual machines. Each VM receives unique SELinux categories that prevent cross-VM access, even if a VM is compromised. Dynamic labeling is the default and requires no configuration. Troubleshoot permission issues with `ausearch` and fix labels with `restorecon`. Keep sVirt enabled for defense-in-depth security in your virtualization environment.
