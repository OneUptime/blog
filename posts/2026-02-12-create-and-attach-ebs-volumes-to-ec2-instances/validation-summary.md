# Validation Summary: How to Create and Attach EBS Volumes to EC2 Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EBS
- Amazon EC2
- AWS CLI
- Linux block devices, filesystems, and `/etc/fstab`
- Amazon CloudWatch EBS metrics

## Sources Consulted
- AWS CLI `create-volume` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-volume.html
- AWS CLI `attach-volume` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/attach-volume.html
- Amazon EBS General Purpose SSD volumes: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- Attach an Amazon EBS volume to an Amazon EC2 instance: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-attaching-volume.html
- Make an Amazon EBS volume available for use: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-using-volumes.html
- Amazon EBS volumes and NVMe: https://docs.aws.amazon.com/ebs/latest/userguide/nvme-ebs-volumes.html
- Map Amazon EBS volumes to NVMe device names: https://docs.aws.amazon.com/ebs/latest/userguide/identify-nvme-ebs-device.html
- Device names for volumes on Amazon EC2 instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/device_naming.html
- Amazon EBS volume limits for Amazon EC2 instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/volume_limits.html
- Use the Instance Metadata Service to access instance metadata: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- Amazon CloudWatch metrics for Amazon EBS: https://docs.aws.amazon.com/ebs/latest/userguide/using_cloudwatch_ebs.html

## Issues Found
- The post stated a gp3 volume size range of 1 GiB to 16 TiB. AWS now documents gp3 as 1 GiB to 64 TiB, so the console guidance was updated.
- The post said each instance has a root EBS volume. Some EC2 instances can be instance-store-backed, so this was narrowed to "Most EC2 instances use a root EBS volume."
- The automation script used IMDSv1 metadata requests. The script now retrieves and uses an IMDSv2 token, which works when IMDSv2 is required.
- The automation script waited only for `/dev/xvdf`. Nitro-based instances expose EBS volumes as NVMe devices, so the script now resolves the attached device by EBS volume serial when `/dev/xvdf` is not present.
- The post said instances can have up to 28 EBS volumes attached. AWS documents this as instance-type dependent, and many Nitro instances have a 28-attachment limit shared by EBS volumes, network interfaces, and NVMe instance store volumes. The wording was corrected.

## Review Notes
The AWS CLI examples use current commands and options. The Linux formatting, mounting, UUID-based `/etc/fstab`, and `nofail` guidance match AWS documentation. For volumes larger than 2 TiB, AWS recommends using a GPT partitioning scheme to access the entire volume; this post's examples use smaller volumes, so no change was required.
