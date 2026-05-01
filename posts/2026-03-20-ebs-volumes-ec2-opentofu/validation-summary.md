# Validation Summary: How to Attach EBS Volumes to EC2 Instances with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS EC2
- Amazon EBS
- HashiCorp AWS provider
- HCL
- Linux volume formatting and mounting

## Sources Consulted
- HashiCorp AWS provider `aws_instance` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- HashiCorp AWS provider `aws_ebs_volume` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ebs_volume.html.markdown
- HashiCorp AWS provider `aws_volume_attachment` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/volume_attachment.html.markdown
- HashiCorp AWS provider `aws_ami` data source documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ami.html.markdown
- Amazon EBS volume types: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html
- Device names for volumes on Amazon EC2 instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/device_naming.html
- Map Amazon EBS volumes to NVMe device names: https://docs.aws.amazon.com/ebs/latest/userguide/identify-nvme-ebs-device.html
- Make an Amazon EBS volume available for use: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-using-volumes.html
- Run commands when you launch an EC2 instance with user data input: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- OpenTofu initialization workflow: https://opentofu.org/docs/cli/init/
- OpenTofu plan command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu apply command: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The EC2 example referenced `data.aws_ami.amazon_linux.id` without defining the `aws_ami` data source. I added a valid `aws_ami` lookup and minimal variable declarations so the HCL no longer references undeclared objects.
- The prerequisite list omitted the KMS permission requirement implied by `kms_key_id = var.kms_key_arn`. I clarified that customer managed KMS keys require the relevant KMS permissions.
- The inline `io2` comment claimed a 64,000 IOPS ceiling, which is not accurate for current AWS documentation on supported Nitro-based configurations. I removed the inaccurate comment.
- The `st1` backup volume comment labeled `size = 2000` as `2 TiB`, but EBS size values are in GiB. I corrected the comment to `2000 GiB`.
- The attachment names used `/dev/sdb` through `/dev/sdd`. AWS documentation recommends avoiding names that overlap with instance-store naming ranges, so I changed them to `/dev/sdf` through `/dev/sdh`.
- The original Step 4 used a `user_data` local to format and mount attached volumes. That would not work as written because the local was never attached to the instance, EC2 user data runs at launch time, and the separate `aws_volume_attachment` resources are created after the instance resource. On `m5.xlarge`, the guest OS also sees attached EBS volumes as NVMe devices rather than the API attachment names. I replaced this with a correct post-attachment workflow that identifies the actual devices with `lsblk`, formats them, and mounts them via UUID entries in `/etc/fstab`.

## Review Notes
- The post is technically valid after the fixes above.
- The examples still assume the AWS provider and region are configured elsewhere in the OpenTofu project.
- Running `tofu plan` before `tofu apply` is valid, although `tofu apply` also creates a fresh plan when no saved plan file is provided.
