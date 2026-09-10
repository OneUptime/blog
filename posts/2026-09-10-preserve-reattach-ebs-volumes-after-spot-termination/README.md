# How to Preserve and Reattach EBS Volumes After Spot Termination

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Spot, Amazon EBS, Storage, Disaster Recovery

Description: Verify EBS deletion settings before Spot loss, preserve a recovery snapshot, and attach existing data safely to replacement capacity in the correct zone.

---

Losing a Spot instance does not have to mean losing its EBS data. However, persistence depends on each attachment's deletion setting, and recovering the volume is a separate procedure from launching replacement compute.

This walkthrough covers an ordinary Linux data volume attached to an EC2 Spot instance. It assumes AWS CLI access to inspect and modify the instance, manage the volume, and use its encryption key. For volumes owned by Kubernetes CSI, use the storage controller's recovery process instead of manually racing its attachment operations.

## Verify persistence before interruption

Set the actual instance ID and inspect every mapping:

```bash
SPOT_INSTANCE_ID=i-0123456789abcdef0
aws ec2 describe-instances \
  --instance-ids "$SPOT_INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].BlockDeviceMappings' \
  --output json
```

Record the volume ID, API device name, Availability Zone, filesystem UUID, encryption key, and application owner outside the instance. A tag such as `DataOwner=reporting` helps find orphaned volumes later, but it is not a substitute for the volume ID.

`DeleteOnTermination` is evaluated per volume. Root volumes normally default to deletion; data-volume defaults depend on how and when they were attached, so inspect the effective value rather than assuming all non-root disks survive. Preserved volumes continue to incur storage charges. [EC2 volume preservation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/preserving-volumes-on-termination.html)

For a verified data mapping named `/dev/sdf`, disable deletion:

```bash
aws ec2 modify-instance-attribute \
  --instance-id "$SPOT_INSTANCE_ID" \
  --block-device-mappings \
  '[{"DeviceName":"/dev/sdf","Ebs":{"DeleteOnTermination":false}}]'
```

Run the describe command again and verify `false`. Also update the launch template or infrastructure definition, otherwise the next instance may recreate the original deletion behavior. This operation cannot recover a volume that was already deleted.

## Separate persistence from consistency

Keeping the block device preserves writes that reached EBS. It does not save data still in application memory, guarantee a database-consistent checkpoint, or replace backups. Application flushes and regular snapshots should happen during normal operation.

Instance store is different: its data does not survive instance termination. Copy anything required from local instance storage to durable storage before loss, rather than expecting `DeleteOnTermination` to protect it. [How EC2 termination works](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-ec2-instance-termination-works.html)

For a database, document the expected recovery point and how to replay its transaction log. If two processes might write after a network partition, use application fencing. A storage recovery runbook should identify which process is authoritative before admitting writes.

## Wait for the old attachment to disappear

After a confirmed interruption, set the recorded volume ID:

```bash
DATA_VOLUME_ID=vol-0123456789abcdef0
aws ec2 describe-volumes \
  --volume-ids "$DATA_VOLUME_ID" \
  --query 'Volumes[0].{State:State,Zone:AvailabilityZone,Attachments:Attachments,Encrypted:Encrypted,KmsKey:KmsKeyId}'
aws ec2 wait volume-available --volume-ids "$DATA_VOLUME_ID"
```

If the waiter fails, inspect the remaining attachment and the old instance state. Do not blindly force-detach a disk from a machine that could still be writing. Resolve the old writer's state first.

Take a recovery snapshot before attempting repair or mounting a damaged filesystem:

```bash
RECOVERY_SNAPSHOT_ID=$(aws ec2 create-snapshot \
  --volume-id "$DATA_VOLUME_ID" \
  --description "Pre-recovery copy after Spot loss" \
  --query SnapshotId --output text)
aws ec2 wait snapshot-completed --snapshot-ids "$RECOVERY_SNAPSHOT_ID"
```

A snapshot captures persisted volume data. It cannot recreate application memory lost with the instance. For multi-volume applications, use the appropriate coordinated backup process. [EBS snapshot creation](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-snapshot.html)

## Attach to replacement capacity in the same zone

Launch or select a recovery instance in the volume's Availability Zone, then inspect it:

```bash
RECOVERY_INSTANCE_ID=i-0fedcba9876543210
aws ec2 describe-instances \
  --instance-ids "$RECOVERY_INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].Placement.AvailabilityZone'
aws ec2 attach-volume \
  --volume-id "$DATA_VOLUME_ID" \
  --instance-id "$RECOVERY_INSTANCE_ID" \
  --device /dev/sdf
aws ec2 wait volume-in-use --volume-ids "$DATA_VOLUME_ID"
```

Choose an unused attachment device name. EBS volumes attach only within the same Availability Zone; if that zone has no suitable capacity, create a new volume from the snapshot in another zone. That produces a different volume ID and a recovery copy, not a cross-zone attachment of the original. [EBS attachment constraints](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-attaching-volume.html)

An On-Demand recovery host can be useful when the original Spot pool is unavailable. It still needs compatible architecture, filesystem support, sufficient attachment limits, and authorization for the volume's KMS key.

## Identify and mount the existing filesystem

On the recovery instance, inspect device identity:

```bash
lsblk -o NAME,SERIAL,SIZE,FSTYPE,MOUNTPOINTS
sudo blkid
```

Nitro instances expose EBS as NVMe devices; `/dev/sdf` in the EC2 attachment API does not guarantee that path inside Linux. Match the EBS volume identity and inspect partitions before selecting a mount source. [EBS NVMe devices](https://docs.aws.amazon.com/ebs/latest/userguide/nvme-ebs-volumes.html)

For example, after verifying that the desired filesystem is the first partition of `/dev/nvme1n1`:

```bash
RECOVERY_DEVICE=/dev/nvme1n1p1
sudo mkdir -p /mnt/recovery
sudo mount -o ro "$RECOVERY_DEVICE" /mnt/recovery
```

Use filesystem-specific recovery options when required. A read-only mount can still involve journal recovery for some filesystems, which is why the snapshot comes first. Never run `mkfs` on the recovered device: formatting overwrites the existing filesystem. [Using an attached EBS volume](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-using-volumes.html)

Verify expected files and checksums, then follow the application's recovery procedure before enabling writes. Recheck `DeleteOnTermination` on the new attachment and record the new recovery owner.

## Conclusion

Protect EBS data with verified deletion settings and regular backups, then recover with explicit volume identity, writer fencing, and zone-aware attachment. A surviving disk is the start of recovery; application consistency and tested restoration finish the job.

## Official Documentation

- [Preserve EBS volumes on termination](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/preserving-volumes-on-termination.html)
- [EC2 termination behavior](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-ec2-instance-termination-works.html)
- [EBS snapshots](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-snapshot.html)
- [Attach EBS volumes](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-attaching-volume.html)
- [Mount existing volumes](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-using-volumes.html)
