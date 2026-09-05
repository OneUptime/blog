# Back Up CloudStack VMs with Recurring Snapshots and Off-Cluster Copies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, Backup, Storage, High Availability, Virtual Machine, Troubleshooting

Description: Build and test a CloudStack backup plan with recurring volume snapshots, application quiescing, separate-zone copies, retention, restore drills, and failure-safe operations.

---

A recurring CloudStack volume snapshot is a useful backup building block, but a schedule alone is not a recovery plan. Volume snapshots are per disk, normally crash-consistent unless the application is quiesced, and depend on primary and secondary storage workflows. An off-cluster copy must also leave the failure domain of the source compute cluster and ideally the credentials, network, and site that could destroy it.

This guide builds a measurable policy, copies snapshots to another CloudStack zone where supported, and proves recovery by restoring a new volume. It also explains when to use CloudStack's backup and recovery framework instead of independent disk snapshots.

## Define Recovery Objectives First

For each VM, record:

- recovery point objective, such as no more than 24 hours of lost data;
- recovery time objective, including data restore and application validation;
- every root and data volume required for a usable recovery;
- application consistency method and quiesce timeout;
- retention and legal-hold requirements;
- source and destination storage failure domains; and
- the people and credentials needed during a management-plane outage.

Hourly snapshots with seven retained copies mean roughly seven hours of policy history, not seven days. Daily snapshots do not guarantee that an application committed a transaction-consistent state at snapshot time.

## Inventory the VM and Storage Path

```bash
cmk list virtualmachines id=VM_UUID
cmk list volumes virtualmachineid=VM_UUID listall=true
cmk list storagepools zoneid=SOURCE_ZONE_UUID
cmk list imagestores zoneid=SOURCE_ZONE_UUID
cmk list snapshotpolicies volumeid=VOLUME_UUID
cmk list snapshots volumeid=VOLUME_UUID listall=true
```

Record volume UUIDs rather than device names. A Linux guest may rename `/dev/vdb` after a configuration change, while CloudStack continues to identify the disk by UUID.

Confirm where completed snapshot data is stored for the hypervisor and storage provider in use. CloudStack commonly creates a snapshot on primary storage and backs it up to secondary storage. Storage-assisted and incremental paths have provider-specific behavior, so verify the current CloudStack storage documentation and the actual snapshot record instead of assuming every backend behaves identically.

## Decide Between Volume Snapshots and VM Backups

Use recurring volume snapshots when each disk can be protected independently and you have a safe guest quiesce procedure. They work well for single-volume servers, immutable roots with a separately protected database, and filesystem-level recovery.

Use CloudStack's backup and recovery framework with a configured provider when you need provider-managed VM backups, a policy catalog, whole-instance workflows, or a supported multi-volume backup process. CloudStack documents that an instance assigned to a backup offering has restrictions on adding or removing volumes, so test lifecycle operations before adopting it broadly.

Neither method replaces an application-native database backup. Database logs, object-store versioning, and verified logical exports may provide a finer recovery point than a hypervisor disk image.

## Quiesce Applications Safely

A snapshot captures disk blocks, not in-memory state. Before a planned snapshot, flush and quiesce the application using its supported mechanism. Examples include database backup locks, filesystem freeze coordinated with the application, or temporarily stopping a service.

For a Linux filesystem, only use `fsfreeze` when the mount and application are known to support it:

```bash
sudo fsfreeze --freeze /srv/application-data
# Trigger and confirm the snapshot promptly from the management side.
sudo fsfreeze --unfreeze /srv/application-data
```

Arrange an independent timed unfreeze before freezing, and document manual recovery in the operational runbook so a failed API call cannot leave production frozen. The recurring policy below does not run these guest commands; application-consistent scheduled snapshots require orchestration that coordinates quiescing with the actual snapshot capture, not just its scheduled time. Do not freeze `/` casually, and do not assume freezing two filesystems at different times creates a transaction-consistent multi-volume set.

For databases, prefer the database vendor's snapshot integration or native backup procedure. A snapshot that replays a journal successfully is crash-consistent, which is different from application-consistent.

## Check the KVM Snapshot Safety Setting

CloudStack 4.23 enables `kvm.snapshot.enabled` by default. For file-based primary storage such as NFS or local storage, a running-VM volume snapshot uses QEMU's disk-only snapshot path; RBD and CLVM use storage-level snapshots. That default is not a blanket safety guarantee for every backend, encryption mode, or version combination.

Inspect the settings and version actually deployed:

```bash
cmk list configurations name=kvm.snapshot.enabled
cmk list configurations name=kvm.incremental.snapshot
qemu-system-x86_64 --version
virsh --version
```

The optional file-based incremental mode requires at least libvirt 7.6 and QEMU 6.1. A manual volume snapshot of an encrypted disk is supported only while its VM is stopped. CloudStack 4.23 rejects recurring snapshot policies for volumes whose disk offering enables encryption; stopping the VM does not remove that policy restriction. Separately, CloudStack 4.23 does not support VM snapshots or incremental volume snapshots on CLVM/CLVM_NG. Do not toggle either setting globally merely to make a job pass. Confirm the storage type, package versions, encryption state, and upgrade history. If the supported path requires stopping the VM, schedule that outage. Test snapshot and restore on a disposable clone before production; do not use a revert test against the source VM.

## Create a Recurring Policy

The `createSnapshotPolicy` API creates a recurring policy for one volume. CloudStack supports one policy per interval type on a volume, with its own retention count, schedule, and timezone. Its schedule format is:

- `MM` for hourly;
- `MM:HH` for daily;
- `MM:HH:DD` with day 1 through 7 for weekly; and
- `MM:HH:DD` with day 1 through 28 for monthly.

For a daily snapshot at 02:30 UTC with seven retained scheduled snapshots:

```bash
cmk create snapshotpolicy \
  volumeid=VOLUME_UUID \
  intervaltype=DAILY \
  schedule=30:02 \
  timezone=Etc/UTC \
  maxsnaps=7
```

The retention count applies to recurring snapshots from that policy, not every manual snapshot. It must also be within the administrator's global hourly, daily, weekly, or monthly snapshot limit.

List the stored policy immediately and have an operator verify the interpreted time:

```bash
cmk list snapshotpolicies volumeid=VOLUME_UUID
```

Use an explicit IANA timezone. Recheck schedules around daylight-saving changes when local civil time is required; UTC is simpler for operational correlation.

## Request an Off-Cluster Copy

Current `createSnapshotPolicy` parameters can include `zoneids`, a comma-separated set of CloudStack zones where the snapshot should be made available. The source zone remains included. For the secondary-storage copy workflow, verify that `snapshot.backup.to.secondary` is enabled at the applicable scope; selecting zones does not make a primary-only snapshot an off-cluster backup. A policy that also makes the snapshot available in a separate recovery zone can be created as follows:

```bash
cmk create snapshotpolicy \
  volumeid=VOLUME_UUID \
  intervaltype=DAILY \
  schedule=30:02 \
  timezone=Etc/UTC \
  maxsnaps=7 \
  zoneids=RECOVERY_ZONE_UUID
```

Use `cmk help createSnapshotPolicy` to confirm parameter spelling for the installed API profile. Some releases and provider paths also expose destination storage IDs or storage replication. These are not interchangeable: a second pool in the same rack may not satisfy an off-cluster requirement.

Verify that the recovery zone has separate secondary storage, network, power, credentials, and deletion controls. If both zones ultimately write to the same NFS appliance, object bucket, Ceph cluster, or administrative account, the copy may share the original failure domain.

For a true off-site or immutable requirement, use a CloudStack backup provider or a supported external backup of secondary-storage content and metadata. Do not copy individual files out of a CloudStack image store and assume they are independently restorable; snapshot chains and metadata may be required. Follow the provider's consistency and restore procedure.

## Observe the First Scheduled Run

Do not wait until an incident to learn that the policy never ran. After the first due time:

```bash
cmk list snapshots volumeid=VOLUME_UUID listall=true showunique=false locationtype=secondary
cmk list events type=SNAPSHOT.CREATE level=ERROR
cmk list asyncjobs listall=true
```

For a specific async job:

```bash
cmk query asyncjobresult jobid=SNAPSHOT_JOB_UUID
```

Check that the newest snapshot reaches `BackedUp` and has a plausible size and creation time. With `showunique=false`, verify a secondary-storage entry for each expected zone and confirm its `datastorestate` is `Ready`; the overall snapshot state alone does not prove that every destination copy completed. On the management server, correlate failures without exposing secrets:

```bash
sudo grep -nE 'SNAPSHOT_JOB_UUID|VOLUME_UUID' \
  /var/log/cloudstack/management/management-server.log | tail -n 300
```

Also alert on the age of the latest successful snapshot, accounting for intentional skips while a volume is inactive. A green storage dashboard does not reveal that a snapshot schedule stopped three weeks ago.

## Test a Restore Without Overwriting the Source

The safest routine drill creates a new volume from a snapshot rather than reverting the production volume:

```bash
cmk create volume \
  name=restore-drill-YYYYMMDD \
  snapshotid=SNAPSHOT_UUID \
  zoneid=RECOVERY_ZONE_UUID \
  diskofferingid=DISK_OFFERING_UUID
cmk query asyncjobresult jobid=CREATE_VOLUME_JOB_UUID
cmk list volumes name=restore-drill-YYYYMMDD listall=true
```

Attach the restored volume to an isolated recovery VM:

```bash
cmk attach volume id=RESTORED_VOLUME_UUID virtualmachineid=RECOVERY_VM_UUID
cmk query asyncjobresult jobid=ATTACH_JOB_UUID
```

Inside the recovery guest, identify the device by size, serial, or filesystem UUID. Do not format it. A read-only mount can still replay a journal and write to the restored disk; for an ext3/ext4 inspection without replay, use `ro,noload` as below. Other filesystems require their own recovery options:

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,UUID,MOUNTPOINTS,SERIAL
sudo blkid
sudo mkdir -p /mnt/restore-check
sudo mount -o ro,noload /dev/RESTORED_PARTITION /mnt/restore-check
```

Skipping journal replay can expose an inconsistent filesystem. If filesystem or database recovery needs writes, perform it on the disposable isolated copy before running application-specific integrity checks; a read-only file inspection alone does not validate service recovery. Measure the time from restore request to validated service, record it against the recovery-time objective, then unmount and detach through CloudStack.

When the snapshot came from a root volume, CloudStack requires an explicit compatible disk offering for `createVolume`; do not assume it can infer one from the old root disk. For a data-volume snapshot, select a compatible offering when required by the API and storage policy. CloudStack does not generally boot an instance directly from a restored root data volume. The documented recovery workflow may require creating a template from the volume or attaching it to a helper VM, depending on the goal and hypervisor.

## Retention, Deletion, and Rollback

Before changing a policy, list and record its ID and settings. In CloudStack 4.23, `createSnapshotPolicy` for the same volume and interval updates the existing policy in place, including when adding the recovery zone in the example above. Verify the returned policy and observe a successful snapshot with the new settings. Do not delete the recorded policy ID afterward: it still identifies the active policy. To roll back the schedule, reapply the recorded settings.

To stop future snapshots without deleting existing recovery points:

```bash
cmk list snapshotpolicies volumeid=VOLUME_UUID
cmk delete snapshotpolicies id=POLICY_UUID
```

Confirm the parameters with `cmk help deleteSnapshotPolicies` for the installed API profile. Policy deletion and snapshot deletion are different actions. Do not bulk-delete old snapshots until the new path has produced and restored a verified copy.

For a restore drill, unmount the test filesystem, detach the restored volume, confirm it is the disposable copy by UUID, and only then delete it. Never automate deletion by display name alone.

## Troubleshooting Failed Backups

- **No snapshot appears:** verify policy timezone and schedule, retention/global limits, volume state, management-server scheduling, and events. Recurring snapshots may be skipped for a detached volume or one attached to a stopped VM after at least one snapshot has been taken since it became inactive.
- **Snapshot stays in `Creating` or fails:** follow the async job into management and agent logs; inspect primary capacity, provider health, and system VM connectivity.
- **Snapshot exists only in the source zone:** verify the policy's returned zone list, destination secondary storage, zone permissions, network reachability, and provider support.
- **KVM snapshot fails while the VM runs:** stop and review the current KVM snapshot setting and version prerequisites instead of forcing the flag.
- **Restore volume cannot attach:** check zone, hypervisor, storage accessibility, VM state, device slots, and the attach job's first QEMU/libvirt error.
- **Restored application is inconsistent:** the snapshot was likely only crash-consistent or volumes were captured at different points. Adopt database-native backup or a coordinated backup provider workflow.
- **Retention consumes unexpected space:** separate recurring from manual snapshots, inspect chains/provider behavior, and verify that failed cleanup jobs are not accumulating.

## Conclusion

A dependable CloudStack backup combines a correctly interpreted recurring policy, a safe application-consistency method, a copy outside the source failure domain, monitoring for missed runs, and recurring restore drills. Keep production rollback non-destructive: restore to a new volume, validate it in isolation, and retain the previous recovery points until the new design has proved both its recovery point and recovery time objectives.

## Official Documentation

- [Apache CloudStack: Storage and Volume Snapshots](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html)
- [Apache CloudStack: Backup and Recovery](https://docs.cloudstack.apache.org/en/latest/adminguide/backup_and_recovery.html)
- [Apache CloudStack: NAS Backup Provider](https://docs.cloudstack.apache.org/en/latest/adminguide/nas_plugin.html)
- [Apache CloudStack: createSnapshotPolicy API](https://cloudstack.apache.org/api/apidocs-4.23/apis/createSnapshotPolicy.html)
- [Apache CloudStack: listSnapshots API](https://cloudstack.apache.org/api/apidocs-4.23/apis/listSnapshots.html)
- [Apache CloudStack: createVolume API](https://cloudstack.apache.org/api/apidocs-4.23/apis/createVolume.html)
