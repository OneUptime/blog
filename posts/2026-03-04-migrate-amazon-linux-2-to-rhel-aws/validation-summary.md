# Validation Summary: How to Migrate from Amazon Linux 2 to RHEL on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Linux 2
- Red Hat Enterprise Linux 9
- Amazon EC2
- Amazon EBS
- AWS CLI
- EC2 Instance Metadata Service
- Red Hat Subscription Manager
- Red Hat Update Infrastructure
- SELinux

## Sources Consulted
- AWS Amazon Linux 2 product page: https://aws.amazon.com/amazon-linux-2/
- Red Hat Convert2RHEL FAQ: https://access.redhat.com/articles/5941531
- Red Hat Cloud Access system registration documentation: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/assembly-red-hat-cloud-access-program-overview
- Red Hat RHEL 9 system registration documentation: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/configuring_basic_system_settings/red_hat_enterprise_linux-9-configuring_basic_system_settings-en-us.pdf
- AWS CLI v2 Linux installation documentation: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- Amazon EC2 IMDS documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- Amazon EBS Linux volume mounting documentation: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-using-volumes.html
- Amazon EBS NVMe device naming documentation: https://docs.aws.amazon.com/ebs/latest/userguide/identify-nvme-ebs-device.html
- AWS re:Post guidance for RHEL registration and RHUI on EC2: https://repost.aws/knowledge-center/amazon-ec2-not-registered-warning-red-hat
- Amazon Linux 2023 SELinux documentation noting AL2 SELinux status: https://docs.aws.amazon.com/linux/al2023/ug/selinux.html

## Issues Found
- The post stated that Amazon Linux 2 reaches end of standard support in June 2025. AWS currently lists Amazon Linux 2 end of support as June 30, 2026, so the date was corrected.
- The metadata commands used IMDSv1-only curl requests. AWS supports and often requires IMDSv2, so the examples now fetch an IMDSv2 token and pass it in metadata requests.
- The post said to register RHEL with `subscription-manager register --auto-attach` without distinguishing AWS licensing models. RHEL pay-as-you-go AMIs on AWS use RHUI repositories, while BYOS or Cloud Access instances are the cases where Red Hat registration applies. The text and command were adjusted.
- The EBS mount example assumed the attached device would appear as `/dev/xvdf1` and hardcoded `xfs` in `/etc/fstab`. AWS Nitro instances expose EBS volumes as NVMe devices, and existing data volumes may use another filesystem. The example now uses `lsblk`, an NVMe example device, detects the filesystem type with `blkid`, and writes `fstab` using UUID plus `nofail`.

## Review Notes
The example remains intentionally generic and still requires operators to substitute real AMI IDs, instance IDs, IAM profiles, security groups, subnets, volume IDs, and the actual device path shown by `lsblk`.
