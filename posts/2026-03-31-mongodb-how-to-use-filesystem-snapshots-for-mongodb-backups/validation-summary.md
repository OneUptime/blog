# Validation Summary: How to Use Filesystem Snapshots for MongoDB Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine, fsync lock, journaling)
- LVM (Logical Volume Manager) snapshots on Linux
- AWS EBS (Elastic Block Store) snapshots
- ZFS snapshots
- AWS CLI (`ec2 create-snapshot`, `ec2 wait`, `ec2 create-volume`, `ec2 attach-volume`)
- Bash scripting

## Sources Consulted
- MongoDB documentation on `fsync` command: https://www.mongodb.com/docs/manual/reference/command/fsync/
- MongoDB documentation on backup with filesystem snapshots: https://www.mongodb.com/docs/manual/tutorial/backup-with-filesystem-snapshots/
- MongoDB documentation on WiredTiger storage engine and journaling: https://www.mongodb.com/docs/manual/core/wiredtiger/
- LVM man pages (`lvcreate`, `lvremove`)
- AWS CLI reference for `ec2 create-snapshot`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshot.html
- AWS CLI reference for `ec2 wait snapshot-completed`: https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/snapshot-completed.html
- ZFS man pages (`zfs-snapshot`, `zfs-send`, `zfs-receive`, `zfs-rollback`, `zfs-clone`)

## Issues Found
1. **Shebang placement in EBS snapshot script**: The `#!/bin/bash` shebang line appeared after a comment (`# Script for EBS snapshot backup`). In a script file, the shebang must be the very first line for the OS to recognize the interpreter. Swapped the two lines so the shebang comes first.

## Review Notes
- The post does not mention that when MongoDB data and journal files reside on separate volumes, all volumes must be snapshotted atomically for a consistent backup. This is an important caveat for production deployments but does not constitute an error in the current content.
- For replica set deployments, best practice is to take snapshots from a secondary member to avoid impacting the primary. The post focuses on standalone scenarios, which is reasonable for the scope.
- The EBS restore section could benefit from a `chown -R mongod:mongod /var/lib/mongodb` step before starting mongod to ensure correct file ownership, but this is an operational detail rather than a technical error.
