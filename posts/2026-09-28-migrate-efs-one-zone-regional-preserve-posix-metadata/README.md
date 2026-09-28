# How to Migrate from EFS One Zone to Regional EFS Without Losing POSIX Ownership or Permissions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, DataSync, Migration, Storage

Description: Move EFS One Zone data to a Regional file system while preserving numeric ownership, permissions, and a consistent cutover state.

Moving from EFS One Zone to Regional EFS changes both the storage destination and the client access design. One Zone stores data in one Availability Zone; a Regional file system stores it across multiple Availability Zones and supports mount targets in the AZs your clients use. Build the Regional replacement first, then transfer the data. [EFS file-system configuration](https://docs.aws.amazon.com/efs/latest/ug/creating-using-create-fs.html).

The difficult part is often preserving authorization. Copying bytes successfully does not prove that a process running as UID 1200 can open the same files after cutover. Plan the migration around numeric ownership, directory traversal permissions, and the identities enforced by access points.

## Establish the ownership baseline

This example assumes an EFS-to-EFS DataSync migration in one account and Region. Before copying, identify representative files owned by different users, group-writable directories, executable files, and restrictive configuration files. Capture their metadata on a Linux source mount:

```bash
stat -c '%u:%g %a %s %y %n' \
  /mnt/source/app/config.yaml \
  /mnt/source/app/bin/worker \
  /mnt/source/shared
```

Use numeric UID/GID values in the acceptance criteria. Usernames are interpreted by the client and can differ between machines even when the stored owner is identical. EFS checks numeric identities for POSIX authorization. [EFS user and group permissions](https://docs.aws.amazon.com/efs/latest/ug/accessing-fs-nfs-permissions.html).

Also inventory access-point root paths and enforced identities. If an application currently sees `/tenants/blue` as its mount root, reproducing `/tenants/blue` on the replacement does not reproduce its access point. Recreate the access point separately with the intended identity and permissions.

## Create Regional storage and verify its network

Omit `--availability-zone-name` when creating the Regional file system:

```bash
aws efs create-file-system \
  --creation-token regional-migration-20260928 \
  --encrypted \
  --performance-mode generalPurpose \
  --throughput-mode elastic \
  --tags Key=Name,Value=regional-app-storage
```

Record the returned ID. After its lifecycle state becomes `available`, create a mount target in each client AZ. Check mount-target security groups and routes before blaming the transfer tool for a timeout.

For the source DataSync location, select a subnet in the One Zone file system's AZ. For the destination, choose a subnet in the Regional file system's VPC and an AZ with a destination mount target. DataSync security groups must reach TCP 2049 on the selected mount targets. Use TLS and an appropriately authorized migration role where file-system policies require it. [DataSync EFS location configuration](https://docs.aws.amazon.com/datasync/latest/userguide/create-efs-location.html).

A Regional destination does not make a client pinned to one mount-target IP immune to that AZ's failure. Test the client deployment and recovery procedure across the AZs it is expected to use.

## Preserve identities without rewriting them

Configure the transfer task with the following metadata options:

```json
{
  "Uid": "INT_VALUE",
  "Gid": "INT_VALUE",
  "PosixPermissions": "PRESERVE",
  "Mtime": "PRESERVE",
  "Atime": "BEST_EFFORT",
  "TransferMode": "CHANGED",
  "OverwriteMode": "ALWAYS",
  "PreserveDeletedFiles": "PRESERVE",
  "VerifyMode": "ONLY_FILES_TRANSFERRED"
}
```

Do not transfer through a destination access point that forces every operation to one application's UID/GID. That remaps ownership and can produce metadata verification failures. Use a narrowly authorized migration mount with sufficient root permissions, then restore application-specific access through the new access points after copying.

DataSync's NFS-family transfers support file and directory timestamps, numeric owners, and POSIX permissions; access time remains best effort. This does not promise preservation of every source-specific filesystem feature. [DataSync metadata support](https://docs.aws.amazon.com/datasync/latest/userguide/metadata-copied.html).

Keep a list of files requiring special semantics, such as links or application-managed locks, and include them in the trial migration. An ownership-preserving configuration cannot replace application testing.

## Make the final pass consistent

Run the first copy while applications continue using the old file system. Monitor application latency and the transfer's failures. Before the final pass, stop all writers and any processes that change directory structure or metadata.

`ONLY_FILES_TRANSFERRED` verifies transferred files after the copy. For a Basic task, a final `POINT_IN_TIME_CONSISTENT` run can verify the whole task scope; include its additional scanning time in the maintenance window. Neither mode freezes the source for you. [Verification choices](https://docs.aws.amazon.com/datasync/latest/userguide/configure-data-verification-options.html).

Decide how to handle source deletions. With `PRESERVE`, files removed after the initial pass survive on the destination. For an exact cutover, reconcile them or use a reviewed `REMOVE` policy on the isolated destination. Keep task filters and location subdirectories fixed during this decision.

## Prove the application can use the replacement

Mount both systems on an administrative Linux client and compare the baseline samples. Check directory traversal as well as the final file's mode. Then test through each new access point using the actual runtime user.

Before reopening traffic, verify these outcomes:

- Numeric ownership and required permission bits match on the acceptance samples.
- A read from the new application mount returns the expected content.
- A write from the application reaches the new file system and has the expected owner.
- Clients in each intended AZ can start and mount successfully.

Update deployments with the replacement file-system ID and access-point IDs. Preserve the source without writers until acceptance is complete. Once writes begin on the destination, moving clients back requires a data reconciliation plan; the old One Zone copy is no longer current. Enable backups on the new Regional system and retire temporary migration privileges after the rollback window.
