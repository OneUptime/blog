# How to Find Restored EFS Data When AWS Backup Places It Under an `aws-backup-restore_*` Directory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Backup, Linux

Description: Locate EFS files restored under aws-backup-restore directories, account for access-point roots, and promote data through a verified staging path.

AWS Backup reports that an EFS restore completed, but the application's normal directory is empty. The likely explanation is the restore location: EFS restores are non-destructive, and AWS Backup places files under a new recovery directory beneath the file-system root.

That behavior applies to full and item-level restores, including restores into a new file system. AWS does not overwrite the original paths automatically. [EFS restore documentation](https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-efs.html).

## Confirm the job and destination first

Use the account and Region that performed the restore:

```bash
aws backup describe-restore-job \
  --region us-east-1 \
  --restore-job-id REPLACE_WITH_RESTORE_JOB_ID \
  --query '{Status:Status,Message:StatusMessage,Resource:CreatedResourceArn,Completed:CompletionDate}'
```

Continue only after the job is complete. Record the returned resource ARN, recovery-point ARN, restore time, and whether you requested a new or existing file system. A completed restore in another Region does not change the filesystem mounted on a production host.

Inspect the actual mount source and options:

```bash
findmnt -rn -t nfs,nfs4 -o TARGET,SOURCE,OPTIONS
```

An EFS TLS mount may show a local proxy address. In that case, use the mount-helper configuration and logs to verify the associated file-system ID. Avoid assuming that a familiar local mount path means it contains the intended restored file system.

## Look from the real file-system root

Recovery directories have names beginning with `aws-backup-restore_`. On a maintenance client with authorized root visibility, and with the file-system root mounted at `/mnt/efs-root`, list only immediate child directories:

```bash
find /mnt/efs-root -mindepth 1 -maxdepth 1 \
  -type d -name 'aws-backup-restore_*' -print
```

Multiple attempts create multiple directories. Match the candidate to the restore operation and inspect known files; do not blindly choose the lexicographically newest path if several operators ran restores.

For an item-level restore of `/tenants/acme/config`, expect the preserved hierarchy beneath the recovery directory, conceptually:

```text
/mnt/efs-root/
  aws-backup-restore_<restore-time>/
    tenants/
      acme/
        config/
```

The requested item path is relative to the **EFS root**, not the client's local mount path. A restore request using `/mnt/efs/config` usually means something different from `/config` inside EFS.

An access point introduces another root mapping. If an application access point exposes `/tenants/acme` as `/`, a recovery directory created at the actual EFS root can be outside that access point's view. Use an authorized administrative mount for inspection, or an explicitly configured recovery access point. Do not weaken the production file-system policy merely to make a troubleshooting command work. [EFS access-point root directories](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html).

## Validate before moving anything

Check representative contents, timestamps, symlinks, owner IDs, group IDs, and modes. Linux identity names can differ between clients; compare numeric UID/GID values as well as names.

```bash
stat -c '%n uid=%u gid=%g mode=%a size=%s' \
  /mnt/efs-root/aws-backup-restore_EXAMPLE/tenants/acme/config/app.conf

sha256sum \
  /mnt/efs-root/aws-backup-restore_EXAMPLE/tenants/acme/config/app.conf
```

Compare with a trusted manifest from the selected recovery point or with application-specific expectations. Comparing against today's production file alone does not prove that an older backup is wrong. Its purpose may be to recover a previous version.

For application data spread across several files, perform the application's consistency check. A successful file restore does not establish that those files form a valid transaction boundary.

## Stage a controlled promotion

Keep the recovery directory intact while preparing a separate staging destination. The following example shows a dry-run copy on Linux; replace both paths only after verifying them:

```bash
sudo rsync -aHn --numeric-ids --itemize-changes \
  /mnt/efs-root/aws-backup-restore_EXAMPLE/tenants/acme/config/ \
  /mnt/efs-root/recovery-staging/acme-config/
```

The trailing slash copies the directory's contents. Review the output, ownership requirements, and target space before removing `-n` for the real staging copy. Preserve only metadata supported by the source and destination; do not add unrelated flags without understanding them. [Upstream rsync manual](https://download.samba.org/pub/rsync/rsync.1).

Stop the consuming application before promoting the staged data, take a rollback copy of any current files, and use the application's documented replacement procedure. Replacing a directory while processes hold open file descriptors does not make those processes adopt its new contents.

Restart a small test workload as the real service user and verify reads, permitted writes, and configuration loading. Only after the application passes its checks should you remove temporary staging or obsolete recovery directories under your retention policy. The recovery path is evidence and a rollback resource until that point.
