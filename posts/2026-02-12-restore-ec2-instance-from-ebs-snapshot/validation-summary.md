# Validation Summary: How to Restore an EC2 Instance from an EBS Snapshot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon EBS volumes
- Amazon EBS snapshots
- Amazon Machine Images (AMIs)
- AWS CLI
- Bash
- Linux filesystem mounting and fstab

## Sources Consulted
- Amazon EC2 User Guide: Replace the root volume for an Amazon EC2 instance without stopping it - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/replace-root.html
- AWS CLI Command Reference: create-volume - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-volume.html
- AWS CLI Command Reference: attach-volume - https://docs.aws.amazon.com/cli/latest/reference/ec2/attach-volume.html
- AWS CLI Command Reference: register-image - https://docs.aws.amazon.com/cli/latest/reference/ec2/register-image.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: copy-snapshot - https://docs.aws.amazon.com/cli/latest/reference/ec2/copy-snapshot.html
- Amazon EC2 User Guide: Device names for volumes on Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/device_naming.html
- Amazon EBS User Guide: Create an Amazon EBS volume - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-volume.html
- Amazon EBS User Guide: Amazon EBS snapshots - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshots.html
- Amazon EBS User Guide: Replace an Amazon EBS volume using a snapshot - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-restoring-volume.html

## Issues Found
- The root volume replacement feature was described as requiring a stopped instance. AWS documents this feature for running instances and notes that AWS automatically reboots the instance during replacement. Updated the command comment and explanation.
- The manual root volume swap used a hardcoded Availability Zone and root device name. Updated the example to capture the instance root device, root volume ID, and Availability Zone from `describe-instances`, then reuse those values.
- The manual root volume attach example waited for `instance-stopped`, which does not verify the new volume attachment. Updated it to wait for `volume-in-use` on the replacement volume.
- The AMI registration example used `--architecture x86_64`, but the launch example used `m7g.large`, an AWS Graviton instance family that requires ARM64-compatible AMIs. Changed the launch example to `m7i.large` to match the x86_64 AMI example.
- The cross-region snapshot copy example used `--destination-region` as if it controlled the CLI destination. AWS CLI documentation says the destination endpoint is selected with `--region` or the configured default Region. Updated the example to use `--region us-east-1`.
- The post claimed volumes restored from snapshots get new filesystem UUIDs. EBS snapshot restores are block-level replicas, so filesystem UUIDs usually remain the same. Updated the pitfall to warn about duplicate UUIDs when mounting original and restored filesystems together.
- Added a note that Nitro-based instances expose EBS volumes as NVMe devices, so users may need to identify the actual device with `lsblk`.

## Review Notes
AWS CLI was not installed in the local environment, so command verification was done against the current official AWS CLI command reference and Amazon EC2/EBS documentation. The examples remain illustrative and require users to substitute real instance, volume, snapshot, subnet, security group, key pair, and AMI IDs.
