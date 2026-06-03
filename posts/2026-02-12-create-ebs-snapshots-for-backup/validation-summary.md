# Validation Summary: How to Create EBS Snapshots for Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EBS snapshots
- Amazon EC2 volumes
- AWS CLI
- AWS Backup
- Linux filesystem freeze
- PostgreSQL service management
- Snapshot archive tier

## Sources Consulted
- AWS Amazon EBS User Guide: How Amazon EBS snapshots work - https://docs.aws.amazon.com/ebs/latest/userguide/how_snapshots_work.html
- AWS Amazon EBS User Guide: Delete an Amazon EBS snapshot - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-deleting-snapshot.html
- AWS Amazon EBS User Guide: View Amazon EBS snapshot information - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-describing-snapshots.html
- AWS Amazon EBS User Guide: Archive Amazon EBS snapshots - https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive.html
- AWS Amazon EBS User Guide: Considerations and limitations for archiving Amazon EBS snapshots - https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive-considerations.html
- AWS Amazon EBS User Guide: Pricing and billing for archiving Amazon EBS snapshots - https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive-pricing.html
- AWS EBS Pricing - https://aws.amazon.com/ebs/pricing/
- AWS CLI Command Reference: ec2 create-snapshot - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshot.html
- AWS CLI Command Reference: ec2 create-snapshots - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshots.html
- AWS CLI Command Reference: ec2 modify-snapshot-tier - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-snapshot-tier.html
- AWS CLI Command Reference: backup create-backup-plan - https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-plan.html
- AWS CLI Command Reference: backup create-backup-selection - https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-selection.html
- PostgreSQL Documentation: Continuous Archiving and Point-in-Time Recovery - https://www.postgresql.org/docs/current/continuous-archiving.html

## Issues Found
- The post implied that the first EBS snapshot stores the full provisioned volume size. AWS documents that a full snapshot includes the data blocks written to the volume, and billing is based on data backed up rather than source volume size. Updated the explanation, diagram label, and cost example.
- The PostgreSQL example used `pg_start_backup` / `pg_stop_backup` and described them as freezing writes. PostgreSQL's current documentation uses `pg_backup_start` / `pg_backup_stop` for low-level online backups, and these functions do not simply freeze writes. Replaced the example with a direct stop/sync/snapshot/start flow that matches the section's "stop or freeze" guidance.
- The snapshot-management command labeled `VolumeSize` as total snapshot storage and estimated cost from it. AWS documents `VolumeSize` as the size of the volume that will be created from the snapshot, not exact billable snapshot storage. Updated the command and output text to avoid presenting it as a cost calculation.

## Review Notes
- The AWS CLI examples use current commands and valid option names according to the AWS CLI command reference.
- The listed standard and archive snapshot prices are plausible for common US Regions as of this review, but AWS pricing varies by Region and can change. Future updates should either qualify pricing by Region or link directly to AWS pricing.
- The local environment did not have the AWS CLI installed, so command validation was performed against official AWS CLI documentation rather than local `--help` output.
