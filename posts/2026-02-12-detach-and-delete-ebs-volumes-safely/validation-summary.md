# Validation Summary: How to Detach and Delete EBS Volumes Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon EBS
- Amazon EC2
- AWS CLI
- Linux filesystems and `/etc/fstab`
- Windows PowerShell disk management
- Amazon EventBridge
- AWS Lambda

## Sources Consulted
- AWS EBS User Guide: Detach an Amazon EBS volume from an Amazon EC2 instance - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-detaching-volume.html
- AWS EBS User Guide: Delete an Amazon EBS volume - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-deleting-volume.html
- AWS EBS User Guide: Create Amazon EBS snapshots - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-snapshot.html
- AWS EBS User Guide: Amazon EBS snapshots - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshots.html
- AWS CLI Command Reference: ec2 detach-volume - https://docs.aws.amazon.com/cli/latest/reference/ec2/detach-volume.html
- AWS CLI Command Reference: ec2 delete-volume - https://docs.aws.amazon.com/cli/latest/reference/ec2/delete-volume.html
- AWS CLI Command Reference: ec2 create-snapshot - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshot.html
- AWS CLI Command Reference: ec2 wait volume-available - https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/volume-available.html
- AWS CLI Command Reference: ec2 wait snapshot-completed - https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/snapshot-completed.html
- AWS CLI Command Reference: ec2 modify-instance-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- Amazon EC2 User Guide: Preserve data when an instance is terminated - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/preserving-volumes-on-termination.html
- Amazon EventBridge User Guide: EventBridge is the evolution of Amazon CloudWatch Events - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cwe-now-eb.html
- Amazon EventBridge User Guide: Schedule a Lambda function - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-run-lambda-schedule.html
- Microsoft Learn: Set-Disk PowerShell cmdlet - https://learn.microsoft.com/en-us/powershell/module/storage/set-disk
- Referenced OneUptime blog link: How to Create EBS Snapshots for Backup - https://oneuptime.com/blog/post/2026-02-12-create-ebs-snapshots-for-backup/view
- Referenced OneUptime product link - https://oneuptime.com

## Issues Found
- Corrected the root-volume detach guidance. AWS does not allow detaching a root EBS volume while the instance is running; the instance must be stopped first.
- Corrected the deletion permanence warning. EBS volume deletion is permanent unless the volume is retained by an EC2 Recycle Bin retention rule.
- Updated the cleanup script to quote volume IDs, verify snapshot creation returned an ID, wait for the snapshot to complete, and skip deletion if the snapshot waiter fails.
- Corrected the `DeleteOnTermination` default explanation. AWS defaults differ depending on whether the volume is a root or data volume, whether it is attached at launch or later, and whether launch-time data volumes are attached through the console or CLI.
- Updated scheduled cleanup wording from CloudWatch Events to Amazon EventBridge Scheduler or scheduled EventBridge rules, reflecting AWS's current service guidance.

## Review Notes
The AWS CLI examples use current commands and options. The referenced OneUptime links resolve to the expected pages. The gp3 and io2 cost examples are plausible for common AWS regions but remain estimates; actual rates vary by Region and provisioned performance settings.
