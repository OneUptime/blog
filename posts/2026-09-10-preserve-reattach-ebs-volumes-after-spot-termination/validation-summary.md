# Validation Summary: How to Preserve and Reattach EBS Volumes After Spot Termination

## Status

validated

## Post Type

Guide

## Technologies Covered

- Amazon EC2 Spot
- Amazon EBS and snapshots
- AWS CLI
- Linux NVMe and filesystems

## Sources Consulted

- [Preserving volumes on termination](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/preserving-volumes-on-termination.html)
- [Modify instance attributes CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html)
- [EBS volume attachment](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-attaching-volume.html)
- [EC2 wait commands](https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/)
- [EBS snapshot creation](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-snapshot.html)
- [EBS NVMe devices](https://docs.aws.amazon.com/ebs/latest/userguide/nvme-ebs-volumes.html)
- [Using an existing EBS volume](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-using-volumes.html)

## Issues Found

No technical issues found.

## Review Notes

- Checked per-attachment deletion settings, block-device mapping syntax, volume and snapshot waiters, and same-zone attachment requirements.
- The recovery sequence preserves a snapshot before filesystem work and correctly distinguishes API device names from Linux NVMe names. Existing-data formatting is explicitly excluded.
- All shell snippets passed bash -n. Commands were not executed against AWS resources or local block devices; filesystem and application recovery remain specific to the recovered data.
