# Migrate Unencrypted EFS to an Encrypted File System with AWS DataSync

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, DataSync, Encryption, Migration

Description: Migrate an unencrypted EFS file system to an encrypted replacement with DataSync, then verify permissions and cut clients over safely.

An EFS encryption change is a storage migration. The encryption setting is fixed when the file system is created, so enabling TLS on the old mount does not encrypt its stored data. Create an encrypted destination, copy and verify the files, then update every client to the new file system. [EFS encryption settings](https://docs.aws.amazon.com/efs/latest/ug/encryption-at-rest.html).

This walkthrough assumes two file systems in one AWS Region and account, a maintenance window for the final synchronization, and Linux applications whose files can be made consistent by stopping their writers. Replace the example resource IDs. For a database, use its supported backup or quiescing procedure before treating copied files as recoverable.

## Inventory what must move

Record the old file system's access points, lifecycle configuration, mount targets, security groups, policy, backup plan, and client mount configuration. DataSync transfers file data and supported metadata; the replacement still needs its own infrastructure configuration. Access-point IDs change, so an ECS task definition or Kubernetes PV that names the old access point must change too.

Inspect the source and create the destination:

```bash
aws efs describe-file-systems --file-system-id fs-0123456789abcdef0
aws efs describe-access-points --file-system-id fs-0123456789abcdef0

aws efs create-file-system \
  --creation-token encrypted-replacement-20260928 \
  --encrypted \
  --performance-mode generalPurpose \
  --throughput-mode elastic \
  --tags Key=Name,Value=encrypted-replacement
```

Omitting `--kms-key-id` uses the default EFS KMS key. Specify a reviewed customer managed key if your key-management requirements call for one. Wait until the new file system is `available`, then create mount targets in the Availability Zones used by the applications. The create API does not also create mount targets. [CreateFileSystem](https://docs.aws.amazon.com/efs/latest/APIReference/API_CreateFileSystem.html).

## Give DataSync a migration path

Create an EFS location for each file system. In the DataSync console, choose the source file system and `/` as its mount path, then select a subnet in its VPC and in an AZ containing a mount target. Repeat for the destination. Enable TLS for both locations.

Allow TCP 2049 from the DataSync network-interface security group to each mount-target security group. Restricted file systems need an authorized DataSync access role. Preserving arbitrary owners requires effective root access; check `ClientMount`, destination `ClientWrite`, and `ClientRootAccess` permissions. A destination access point that enforces one UID/GID defeats preservation of multiple source owners, so use a migration path without that identity override. [DataSync EFS access requirements](https://docs.aws.amazon.com/datasync/latest/userguide/create-efs-location.html).

Keep normal application clients off the new file system during copying. Otherwise a later synchronization can overwrite their changes.

## Copy with explicit metadata and deletion behavior

Create a Basic mode task with the two location ARNs returned by DataSync:

```bash
aws datasync create-task \
  --name efs-encryption-migration \
  --task-mode BASIC \
  --source-location-arn arn:aws:datasync:us-east-1:111122223333:location/loc-0123456789abcdef0 \
  --destination-location-arn arn:aws:datasync:us-east-1:111122223333:location/loc-0123456789abcdef1 \
  --options '{
    "TransferMode":"CHANGED",
    "OverwriteMode":"ALWAYS",
    "Uid":"INT_VALUE",
    "Gid":"INT_VALUE",
    "PosixPermissions":"PRESERVE",
    "Mtime":"PRESERVE",
    "Atime":"BEST_EFFORT",
    "PreserveDeletedFiles":"PRESERVE",
    "VerifyMode":"POINT_IN_TIME_CONSISTENT"
  }'
```

The options preserve numeric ownership and POSIX permissions. Access time preservation is best effort. Whole-location verification is supported by Basic tasks; it is not a snapshot or an application-consistency guarantee. [DataSync task options](https://docs.aws.amazon.com/datasync/latest/apireference/API_Options.html).

Start the task with `aws datasync start-task-execution --task-arn TASK_ARN`, then inspect the returned execution ARN with `describe-task-execution`. Require a successful execution and investigate verification errors before proceeding.

## Freeze writers and reconcile the final delta

The first pass reduces downtime. The final pass establishes the cutover state:

1. Stop every writer, including scheduled jobs and background consumers. Flush or close application state using the application's own procedure.
2. Run another synchronization while the source remains unchanged.
3. Review files deleted from the source since the first pass. `PRESERVE` leaves their destination copies behind. If an exact mirror is required, use `REMOVE` only on this dedicated destination after reviewing task scope and filters.
4. Require successful verification, then mount the destination on a test client and check representative ownership, permissions, and content.

For example, GNU `stat` exposes numeric identities without depending on local account names:

```bash
stat -c '%u:%g %a %s %n' /mnt/old/app/config /mnt/new/app/config
sha256sum /mnt/old/app/config /mnt/new/app/config
```

Test reads and writes as the application user through its new access point. A root user's successful test can hide the exact permission issue production will encounter.

## Cut over and retain a rollback point

Update mount sources, access-point ARNs, IAM resource references, and deployment configuration. Remount or replace clients in a controlled sequence; changing a hostname alone does not move an existing NFS mount. Confirm that new writes reach the destination and that its `Encrypted` field is `true`.

Keep the original file system protected and unavailable to writers for the agreed rollback period. Once applications write to the replacement, rollback requires reconciling those new writes. Do not restart old clients against stale data. Finish by enabling the intended backup and lifecycle settings on the replacement and removing the temporary migration access after acceptance.
