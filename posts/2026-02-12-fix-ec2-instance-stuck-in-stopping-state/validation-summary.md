# Validation Summary: How to Fix EC2 Instance Stuck in Stopping State

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS EC2
- AWS CLI
- AWS Health
- Amazon EBS snapshots
- Linux shutdown scripts
- NFS mounts
- systemd service configuration
- MySQL InnoDB
- PostgreSQL WAL/checkpoint configuration
- AWS Lambda with boto3
- Amazon SNS

## Sources Consulted
- AWS CLI `stop-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/stop-instances.html
- Amazon EC2 stop issue troubleshooting: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstancesStopping.html
- AWS CLI `terminate-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/terminate-instances.html
- Amazon EC2 termination issue troubleshooting: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstancesShuttingDown.html
- Amazon EC2 instance termination methods: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-terminate-methods.html
- AWS CLI `create-snapshot` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshot.html
- AWS CLI `describe-events` command reference for AWS Health: https://docs.aws.amazon.com/cli/latest/reference/health/describe-events.html
- systemd.kill manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.kill.html
- Linux `nfs(5)` manual: https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux `umount(8)` manual: https://man7.org/linux/man-pages/man8/umount.8.html
- MySQL 8.4 `innodb_fast_shutdown` documentation: https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html
- PostgreSQL 15 WAL/checkpoint configuration: https://www.postgresql.org/docs/15/runtime-config-wal.html
- PostgreSQL 15 WAL configuration notes: https://www.postgresql.org/docs/15/wal-configuration.html

## Issues Found
- The post said there is no force-stop button in the EC2 console. AWS documentation now describes console-based force stop for instances in the `stopping` state, so that statement was removed.
- The post described `aws ec2 stop-instances --force` as an immediate hard power-off. AWS documents that `--force` first attempts graceful shutdown and then forces shutdown after a timeout; `--skip-os-shutdown` bypasses graceful OS shutdown. Updated the explanation and added the explicit `--skip-os-shutdown` example.
- The terminate fallback used plain `terminate-instances`. Current AWS CLI supports `terminate-instances --force` for stuck termination flows, so the command and surrounding wording were updated.
- The NFS section recommended `soft` mounts without warning about data-integrity tradeoffs. Added the caveat that `soft` can return I/O errors and should be limited to read-mostly or non-critical mounts.
- The MySQL comment implied `innodb_fast_shutdown = 1` was a special reduction from normal behavior. MySQL documents it as the default fast shutdown mode, so the comment was corrected.
- The PostgreSQL comment said `checkpoint_timeout` reduces shutdown time. PostgreSQL documents it as controlling checkpoint frequency and crash recovery implications, so the comment was corrected to focus on recovery time after forced stop.
- The Lambda section said it detects instances stuck for more than 15 minutes, but the sample code only lists all instances currently in `stopping`. Updated the text and removed unused imports/variables so the code matches its behavior.
- The state table advised contacting AWS Support for `shutting-down` instances. AWS now supports force terminate for stuck terminating instances, so the table was updated to mention force terminate first.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against the current official AWS CLI command reference instead of local `--help` output. The snapshot command syntax and AWS Health filter shape are valid, but snapshots of attached volumes should still be treated as crash-consistent emergency backups unless the workload is quiesced.
