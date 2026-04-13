# Validation Summary: How to Handle Out-of-Disk-Space Situations in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (mongosh, admin commands, replica sets, compact, logRotate)
- Linux filesystem management (df, du, resize2fs, growpart, LVM)
- AWS CLI (EBS volume modification)
- Prometheus (alerting rules with node_exporter metrics)
- Bash/cron (disk usage monitoring script)

## Sources Consulted
- MongoDB documentation on `logRotate` admin command: https://www.mongodb.com/docs/manual/reference/command/logRotate/
- MongoDB documentation on `compact` command: https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB documentation on replica set initial sync: https://www.mongodb.com/docs/manual/core/replica-set-sync/
- MongoDB documentation on `rs.status()`: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- AWS CLI `modify-volume` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-volume.html
- Prometheus node_exporter filesystem metrics documentation
- Linux man pages for `growpart`, `resize2fs`, `pvcreate`, `vgextend`, `lvextend`

## Issues Found
No technical issues found.

## Review Notes
- The filesystem resize examples (`resize2fs`) assume ext2/ext3/ext4. MongoDB officially recommends XFS for the WiredTiger storage engine, which would require `xfs_growfs` instead. The commands shown are correct for ext4 but readers on XFS would need to adapt. This is not an error since the post doesn't claim a specific filesystem, but a future enhancement could mention both options.
- The summary mentions "TTL indexes" as a long-term strategy, but TTL indexes are not discussed in the post body. This is a minor writing inconsistency rather than a technical error.
- The `compact` command behavior varies by MongoDB version: from 4.4+ it can run on the primary, and from 6.1+ it releases disk space back to the OS for the WiredTiger engine. The post's advice to run during a maintenance window is sound general guidance.
