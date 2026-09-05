# Validation Summary: How to Back Up CloudStack VMs with Recurring Volume Snapshots and Off-Cluster Copies

## Status
validated

## Post Type
Technical guide with CloudMonkey commands and Linux restore examples.

## Technologies Covered
- Apache CloudStack 4.23: volume snapshots, recurring policies, cross-zone copies, volume restoration, and backup providers.
- Apache CloudMonkey CLI and asynchronous CloudStack APIs.
- KVM, QEMU, libvirt, and encrypted volumes.
- NFS, local/file-based storage, Ceph RBD, CLVM, and CLVM_NG.
- Linux filesystem freezing, journal recovery, and block-device inspection.
- Backup retention, recovery objectives, application consistency, and failure domains.

## Sources Consulted
- [CloudStack storage administration](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html): snapshot behavior, KVM requirements, retention, inactive volumes, cross-zone copying, and restore restrictions.
- [CloudStack Backup and Recovery](https://docs.cloudstack.apache.org/en/latest/adminguide/backup_and_recovery.html).
- [CloudStack NAS backup provider](https://docs.cloudstack.apache.org/en/latest/adminguide/nas_plugin.html): supported storage, guest quiescing, and recovery prerequisites.
- [createSnapshotPolicy API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/createSnapshotPolicy.html).
- [listSnapshotPolicies API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/listSnapshotPolicies.html).
- [deleteSnapshotPolicies API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/deleteSnapshotPolicies.html).
- [listSnapshots API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/listSnapshots.html).
- [createVolume API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/createVolume.html).
- [attachVolume API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/attachVolume.html).
- [listVolumes API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/listVolumes.html).
- [listVirtualMachines API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/listVirtualMachines.html).
- [listStoragePools API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/listStoragePools.html).
- [listImageStores API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/listImageStores.html).
- [listConfigurations API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/listConfigurations.html).
- [listEvents API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/listEvents.html).
- [listAsyncJobs API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/listAsyncJobs.html).
- [queryAsyncJobResult API, 4.23](https://cloudstack.apache.org/api/apidocs-4.23/apis/queryAsyncJobResult.html).
- [SnapshotManagerImpl, tagged 4.23.0.0 source](https://github.com/apache/cloudstack/blob/4.23.0.0/server/src/main/java/com/cloud/storage/snapshot/SnapshotManagerImpl.java): policy update behavior and encrypted-offering rejection.
- [VolumeApiServiceImpl, tagged 4.23.0.0 source](https://github.com/apache/cloudstack/blob/4.23.0.0/server/src/main/java/com/cloud/storage/VolumeApiServiceImpl.java): snapshot-based volume allocation and offering selection.
- [Snapshot datastore record, tagged 4.23.0.0 source](https://github.com/apache/cloudstack/blob/4.23.0.0/engine/schema/src/main/java/org/apache/cloudstack/storage/datastore/db/SnapshotDataStoreVO.java).
- [CloudMonkey usage](https://github.com/apache/cloudstack-cloudmonkey/wiki/Usage), [help implementation](https://github.com/apache/cloudstack-cloudmonkey/blob/main/cmd/help.go), and [API command implementation](https://github.com/apache/cloudstack-cloudmonkey/blob/main/cmd/api.go).
- [util-linux fsfreeze manual](https://man7.org/linux/man-pages/man8/fsfreeze.8.html).
- [util-linux mount manual](https://man7.org/linux/man-pages/man8/mount.8.html).
- [util-linux lsblk manual](https://man7.org/linux/man-pages/man8/lsblk.8.html) and [blkid manual](https://man7.org/linux/man-pages/man8/blkid.8.html).
- [virsh manual](https://www.libvirt.org/manpages/virsh.html) and [QEMU invocation reference](https://www.qemu.org/docs/master/system/invocation.html).

## Issues Found
1. **Policy replacement could disable the intended schedule.** The original instructions proposed creating a replacement, waiting for success, and deleting the old policy. Tagged 4.23 code updates the existing policy when volume and interval match. Corrected the instructions to verify the updated policy, retain its ID, and reapply recorded settings for rollback. Explicitly connected this behavior to the second DAILY example.
2. **Encrypted-volume scheduling restriction was omitted.** Stopping an encrypted VM permits supported manual snapshots, but does not make its encrypted disk offering eligible for a recurring policy. Added the explicit policy rejection documented in the tagged implementation.
3. **CloudMonkey help syntax was incorrect.** `cmk help create snapshotpolicy` looks up `create` rather than the full API name. Changed it to `cmk help createSnapshotPolicy` and provided the corresponding full-name help command for deletion. The existing `cmk delete snapshotpolicies id=...` invocation itself is valid.
4. **Guest freezing was not connected to recurring execution.** The policy has no guest pre/post command parameters. Clarified that application consistency requires coordination with actual capture and that the manual freeze example is not automatically invoked by the recurring schedule. Required the timed unfreeze to be arranged before freezing; a runbook alone cannot enforce a timeout.
5. **Secondary-storage backup prerequisite was implicit.** Added the requirement to verify `snapshot.backup.to.secondary` at the applicable scope before relying on the secondary-storage cross-zone workflow.
6. **Replica verification was incomplete.** Changed the first-run listing to `showunique=false locationtype=secondary` and distinguished overall snapshot completion from individual destination datastore readiness. A policy's desired destinations are not evidence of successful copies.
7. **Snapshot-age monitoring omitted legitimate skips.** Replaced ambiguous “policy age” with the latest successful snapshot's age. Added the documented exception for inactive volumes to monitoring and troubleshooting guidance.
8. **Read-only mounting did not guarantee no writes.** `mount -o ro` can replay an ext3/ext4 journal. Scoped the example to ext3/ext4 and used `ro,noload`. Explained that skipping recovery may expose inconsistency, that other filesystems need their own options, and that writable application recovery belongs on the disposable isolated copy.

## Review Notes
- Verified schedule formats, required parameters, timezone usage, retention scope, inventory filters, event filtering, async-job queries, and attach arguments against official APIs. UUIDs, dates, paths, and job IDs remain intentional placeholders.
- The 4.23 API documentation links resolved successfully through direct HTTPS retrieval after the browser tool rejected some URLs. The three linked administration pages also resolved to the intended resources.
- The storage documentation confirms that running KVM snapshots became enabled by default in 4.22, so the statement that 4.23 enables them by default remains correct. File-based incremental prerequisites of libvirt 7.6 and QEMU 6.1, and the stopped-VM requirement for encrypted snapshots, match the documentation.
- The current storage guide contains conflicting CLVM_NG incremental-snapshot language. The post follows its explicit release-specific statement that VM snapshots and incremental volume snapshots are unsupported on CLVM/CLVM_NG as of 4.23.0.0. Verify release/provider support before using that path.
- CloudMonkey normally polls asynchronous jobs automatically (`asyncblock=true`). Explicit job-result queries remain valid when a job ID is available; they are not necessarily required after every successful blocking CLI call.
- Administrative storage/configuration queries require appropriate privileges. Project resources may require explicit project selection. Run QEMU/libvirt version checks on the relevant KVM host.
- Provider capability and destination failure-domain isolation remain deployment-specific. A backup provider does not automatically guarantee off-site storage or immutability. Application checks and legal-hold enforcement must be designed for the actual workload.
- Validation was documentation and source based. No CloudStack deployment or Linux recovery guest was supplied, so snapshots, copies, mounts, and restores were not executed. Bash syntax and the validation JSON were checked locally; production recovery success still requires the described restore drill.
