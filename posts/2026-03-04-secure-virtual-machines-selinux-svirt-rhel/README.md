# How to Secure Virtual Machines with SELinux sVirt on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, SELinux, sVirt, Security, Virtualization, Linux

Description: Learn how SELinux sVirt provides mandatory access control for KVM virtual machines on RHEL, isolating VMs from each other and the host system.

---

sVirt integrates SELinux with libvirt to provide Mandatory Access Control (MAC) for KVM virtual machines. Each VM gets a unique SELinux label, preventing it from accessing files or resources belonging to other VMs or the host, even if a guest escape vulnerability is exploited.

## Understanding sVirt Labels

```bash
# Check SELinux status
getenforce

# View the SELinux label of a running VM process
ps -eZ | grep qemu

# Example output:
# system_u:system_r:svirt_t:s0:c123,c456 ... qemu-kvm -name rhel9-vm

# Each VM gets a unique MCS category pair (c123,c456)
# This ensures VM isolation at the kernel level
```

## How sVirt Labeling Works

```bash
# View the SELinux labels on a VM's disk image
ls -Z /var/lib/libvirt/images/

# Example:
# system_u:object_r:svirt_image_t:s0:c123,c456 rhel9-vm.qcow2

# The disk image label matches the VM process label
# Other VMs with different categories cannot access this file
```

## Dynamic vs Static Labeling

By default, sVirt uses dynamic labeling (random categories assigned at VM start):

```bash
# View the security model in the VM XML
sudo virsh dumpxml rhel9-vm | grep -A10 '<seclabel'

# Dynamic labeling (default):
# <seclabel type='dynamic' model='selinux' relabel='yes'>
#   <label>system_u:system_r:svirt_t:s0:c123,c456</label>
#   <imagelabel>system_u:object_r:svirt_image_t:s0:c123,c456</imagelabel>
# </seclabel>
```

## Configuring Static SELinux Labels

For shared resources between specific VMs, you can set static labels:

```bash
# Edit the VM XML
sudo virsh edit rhel9-vm

# Set a static label:
# <seclabel type='static' model='selinux' relabel='yes'>
#   <label>system_u:system_r:svirt_t:s0:c100,c200</label>
# </seclabel>

# Two VMs with the same static labels can share disk images
```

## Troubleshooting SELinux Issues with VMs

```bash
# Check for SELinux denials related to virtualization
sudo ausearch -m avc -ts recent | grep svirt

# View all recent SELinux denials
sudo sealert -a /var/log/audit/audit.log | head -50

# Fix file labeling on VM images
sudo restorecon -Rv /var/lib/libvirt/images/

# If a VM fails to start due to SELinux, check the audit log
sudo ausearch -m avc -c qemu-kvm --raw | audit2why
```

## Working with Non-Standard Image Locations

```bash
# If VM images are stored outside the default path,
# set the correct SELinux context
sudo semanage fcontext -a -t svirt_image_t "/data/vm-images(/.*)?"
sudo restorecon -Rv /data/vm-images/
```

## Disabling sVirt (Not Recommended)

```bash
# Only for troubleshooting - do not leave disabled in production
# Edit the VM XML:
# <seclabel type='none' model='selinux'/>

# Or set SELinux to permissive temporarily
sudo setenforce 0

# Re-enable when done troubleshooting
sudo setenforce 1
```

## Verifying VM Isolation

```bash
# Start two VMs and verify they have different labels
ps -eZ | grep qemu

# Try to access one VM's disk from another VM's context
# This should be denied by SELinux
```

Keep SELinux in enforcing mode for production KVM hosts. sVirt provides a critical layer of defense that isolates VMs from each other at the kernel level. If a VM is compromised, sVirt prevents the attacker from accessing other VM disk images or host resources.
