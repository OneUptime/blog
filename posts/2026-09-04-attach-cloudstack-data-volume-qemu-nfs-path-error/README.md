# How to Attach a Data Volume When CloudStack Reports a QEMU or NFS Path Error

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, Storage, KVM, QEMU, NFS, Troubleshooting

Description: Trace a failed CloudStack data-volume attach from API state through KVM libvirt and NFS, repair the managed storage path, and detach or migrate safely if recovery fails.

---

When `attachVolume` fails with a QEMU file-open error or an NFS path error, the volume usually is not the first thing to change. CloudStack, libvirt, the KVM host, and the NFS server must agree on the volume UUID, storage pool, path, access mode, and permissions. Manually attaching a guessed file with `virsh` can make the VM run temporarily while leaving CloudStack's state wrong.

Preserve the failed async job and diagnose the storage object CloudStack actually selected.

## Reconcile the Volume and VM

Capture the volume UUID, VM UUID, zone, hypervisor, cluster, storage pool, state, type, size, device ID, and latest job:

```bash
cmk list volumes id=VOLUME_UUID listall=true
cmk list virtualmachines id=VM_UUID
cmk list storagepools id=STORAGE_POOL_UUID
cmk query asyncjobresult jobid=ATTACH_JOB_UUID
```

CloudStack's `attachVolume` API requires the volume ID and VM ID; `deviceid` is optional and CloudStack can choose the next available device. Confirm the volume is a data disk, is not already attached, is compatible with the VM's hypervisor, and is visible in the same zone/allowed placement.

Search the exact identifiers on the management server:

```bash
sudo grep -nE 'ATTACH_JOB_UUID|VOLUME_UUID|VM_UUID' \
  /var/log/cloudstack/management/management-server.log | tail -n 300
```

Then inspect the agent on the VM's current KVM host:

```bash
sudo grep -nE 'VOLUME_UUID|VM_UUID' \
  /var/log/cloudstack/agent/agent.log | tail -n 300
sudo journalctl -u libvirtd -u cloudstack-agent -n 250 --no-pager
```

Use the first QEMU/libvirt error. Later “attach failed” messages usually lose the path or permission detail.

## Verify CloudStack's Storage Pool, Not a Guessed Directory

On the KVM host:

```bash
sudo virsh pool-list --all
sudo virsh pool-info CLOUDSTACK_POOL_NAME
sudo virsh pool-dumpxml CLOUDSTACK_POOL_NAME
findmnt -t nfs,nfs4
df -hT
```

CloudStack creates and manages libvirt storage pools. Compare the pool source, target, NFS server, export, and mount options with the CloudStack storage-pool record. Do not create a second manual mount over the managed target or change the libvirt XML out of band.

Check whether the path in the error exists and is accessible without modifying it:

```bash
sudo namei -l /PATH/FROM/QEMU_ERROR
sudo stat /PATH/FROM/QEMU_ERROR
sudo -u qemu test -r /PATH/FROM/QEMU_ERROR && echo readable
```

The runtime QEMU account varies by distribution; determine it from the active domain/process rather than assuming `qemu`. Avoid `chown -R` on CloudStack storage. Ownership may be intentional, and a recursive change can corrupt access for every VM.

## Diagnose NFS from the Affected Host

```bash
getent ahosts NFS_SERVER
showmount -e NFS_SERVER
rpcinfo -p NFS_SERVER
nfsstat -m
sudo journalctl -k -n 250 --no-pager | \
  grep -Ei 'nfs|stale|not responding|permission|I/O error'
```

Common causes include:

- the export path or server address changed while CloudStack still references the old pool;
- one KVM host has a stale/missing mount;
- export CIDRs exclude the host;
- NFS version or `nconnect` options differ from the pool definition;
- root squash or UID/GID permissions no longer match;
- the server is read-only, full, or out of inodes;
- a stale file handle follows storage-side replacement; or
- SELinux/AppArmor blocks QEMU even though root can read the file.

The CloudStack storage guide supports NFS `vers` and `nconnect` pool options and warns that `nconnect` is established by the first mount to a server/version on a client. Changing it for one pool may not change an existing shared client mount.

Do not force-unmount a path used by running VMs. Put workloads and the pool/host into the appropriate maintenance workflow first.

## Verify Libvirt/QEMU Context

Inspect, but do not edit, the running VM definition:

```bash
sudo virsh domblklist VM_DOMAIN --details
sudo virsh dumpxml VM_DOMAIN | sed -n '/<disk /,/<\/disk>/p'
sudo journalctl -k -b | grep -Ei 'apparmor|avc:|selinux|denied'
```

A path that root can read may still fail under QEMU's service account, SELinux label, AppArmor profile, or libvirt namespace. Use the distribution's supported policy tooling and CloudStack/libvirt paths. Do not disable all confinement to make one attach work.

If QEMU reports unsupported format/backing files, inspect with read-only metadata tools from a controlled context:

```bash
sudo qemu-img info --backing-chain /PATH/FROM/QEMU_ERROR
```

Do not run repair or conversion commands on a CloudStack-managed volume in place.

## Restore the Managed Path

Choose the repair that matches the first error:

- Restore the original NFS endpoint/export while CloudStack still references it.
- Correct export authorization or the narrow QEMU security policy.
- Reconnect/re-enable an otherwise healthy storage pool or host through CloudStack.
- Move the VM to a host with valid access if placement policy supports it.
- Stop the VM and migrate the volume to a healthy pool through CloudStack when the old pool cannot be repaired.

CloudStack documents volume migration within a zone. KVM does not support standalone live volume migration because the running VM XML cannot be refreshed safely. Use `migrateVirtualMachineWithVolume` to move the VM and its disks to another host, or stop the VM before using `migrateVolume`, exactly as the current storage guide directs.

Do not change the storage URL in MySQL or move the disk file manually.

## Retry One Attach

When host and pool state are healthy, retry through CloudStack without forcing a device ID unless the guest requires one:

```bash
cmk attach volume id=VOLUME_UUID virtualmachineid=VM_UUID
cmk query asyncjobresult jobid=NEW_ATTACH_JOB_UUID
cmk list volumes id=VOLUME_UUID
```

Inside the guest, identify the new disk by size, serial, or filesystem UUID, not by assuming `/dev/vdb`:

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,UUID,MOUNTPOINTS,SERIAL
sudo blkid
dmesg | tail -n 100
```

Do not format a disk just because it has no mount point. Verify its identity and whether it contains data. Mount read-only first when recovering an existing filesystem.

## Verify and Roll Back

Confirm the volume reports attached to the intended VM, appears in `virsh domblklist`, survives a CloudStack-managed reboot, and can be read/written according to the change plan. Check application data and filesystem health with the filesystem's supported offline/online procedure.

To roll back, stop application I/O, unmount the filesystem in the guest, and detach through CloudStack:

```bash
cmk detach volume id=VOLUME_UUID
cmk query asyncjobresult jobid=DETACH_JOB_UUID
```

Do not delete the volume. If an attach job's state is ambiguous, reconcile CloudStack, libvirt, and the guest before retrying or detaching.

## Conclusion

An attach path is owned by CloudStack end to end. Follow the async job to the KVM agent, reconcile the managed libvirt pool and NFS export, check QEMU permissions/policy, and restore or migrate the pool through supported operations. Retry once, identify the guest disk safely, and use a CloudStack detach as rollback.

## Official Documentation

- [Apache CloudStack: Storage Overview and Volumes](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html)
- [Apache CloudStack: attachVolume API](https://cloudstack.apache.org/api/apidocs-4.23/apis/attachVolume.html)
- [Apache CloudStack: KVM Host Installation](https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html)
- [libvirt: Storage Management](https://libvirt.org/storage.html)
- [QEMU: Disk Image Utility](https://www.qemu.org/docs/master/tools/qemu-img.html)
