# Validation Summary: How to Back Up MongoDB with Filesystem Snapshots

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- LVM (Logical Volume Manager) snapshots on Linux
- AWS EBS (Elastic Block Store) snapshots
- AWS CLI (`ec2 create-snapshot`, `describe-snapshots`, `delete-snapshot`)
- GCP Persistent Disk and Azure Managed Disk (mentioned)
- mongosh (MongoDB Shell)
- Bash scripting
- tar archiving
- AWS S3

## Sources Consulted
- MongoDB official documentation on filesystem snapshots for backup: https://www.mongodb.com/docs/manual/tutorial/backup-with-filesystem-snapshots/
- MongoDB official documentation on `fsync` command: https://www.mongodb.com/docs/manual/reference/command/fsync/
- MongoDB official documentation on `fsyncUnlock`: https://www.mongodb.com/docs/manual/reference/command/fsyncUnlock/
- MongoDB WiredTiger checkpoint documentation: https://www.mongodb.com/docs/manual/core/wiredtiger/#snapshots-and-checkpoints
- Linux `lvcreate` man page for LVM snapshot syntax
- AWS CLI reference for `ec2 create-snapshot`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshot.html
- AWS CLI reference for `ec2 describe-snapshots`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-snapshots.html
- Bash quoting rules for `$(...)` command substitution within double-quoted strings

## Issues Found
1. **Shell quoting bug in AWS retention script (line 146)**: The `${RETENTION_DAYS}` variable was enclosed in single quotes inside a `$(...)` command substitution: `'$(date -d '-${RETENTION_DAYS} days' +%Y-%m-%d)'`. Single quotes inside `$(...)` prevent variable expansion, so `${RETENTION_DAYS}` would be passed literally to `date -d`, causing the command to fail. Fixed by changing the inner single quotes to double quotes: `"$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d)"`. Double quotes inside `$(...)` are valid because command substitution creates a new quoting context in bash.

## Review Notes
- The `date -d` flag used in the retention script is GNU coreutils-specific and won't work on macOS/BSD systems. This is acceptable since the script targets Linux EC2 instances.
- The `aws ec2 describe-snapshots` command would benefit from `--owner-ids self` to avoid scanning public snapshots, but the `volume-id` filter makes results correct regardless.
- All MongoDB commands (`fsync`, `fsyncUnlock`, `db.runCommand({ ping: 1 })`) use correct syntax for current mongosh.
- WiredTiger checkpoint interval of 60 seconds is correctly stated (default value).
- WiredTiger as default since MongoDB 3.2 is correct.
- LVM commands (`lvcreate`, `lvremove`, `mount -o ro`) use correct syntax and flags.
- The overall backup and restore workflow is sound and aligns with MongoDB official documentation recommendations.
