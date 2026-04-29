# Validation Summary: How to Deploy Jenkins on AWS with OpenTofu

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenTofu
- HCL
- AWS EC2
- Amazon EBS
- AWS IAM
- AWS Security Groups
- Jenkins
- Amazon Linux 2023

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- Jenkins Linux installation guide: https://www.jenkins.io/doc/book/installing/linux/
- Jenkins Java support policy: https://www.jenkins.io/doc/book/platform-information/support-policy-java/
- Jenkins Linux repository signing key change notice: https://www.jenkins.io/blog/2025/12/23/repository-signing-keys-changing/
- Amazon EBS features and benefits: https://docs.aws.amazon.com/ebs/latest/userguide/EBSFeatures.html
- Map Amazon EBS volumes to NVMe device names: https://docs.aws.amazon.com/ebs/latest/userguide/identify-nvme-ebs-device.html
- Device names for volumes on Amazon EC2 instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/device_naming.html
- Amazon Linux 2023 package management: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html
- Terraform Registry `aws_security_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform Registry `aws_ebs_volume` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume

## Issues Found
1. **Outdated Jenkins RPM repository and signing key**: The post used `https://pkg.jenkins.io/redhat-stable/jenkins.repo` and `jenkins.io-2023.key`. I updated those to `https://pkg.jenkins.io/rpm-stable/jenkins.repo` and `https://pkg.jenkins.io/rpm-stable/jenkins.io-2026.key` to match current Jenkins installation guidance and the 2025-12-23/2026-01-21 RPM signing key rotation.

2. **Jenkins dependency installation was outdated for a current deployment guide**: The post installed `java-17-amazon-corretto` only. I changed this to `fontconfig` plus `java-21-amazon-corretto`, which matches current Jenkins Linux installation guidance for new installs on RPM-based systems while keeping the commands appropriate for Amazon Linux 2023.

3. **EBS volume Availability Zone could drift from the EC2 subnet**: The original snippet created the EBS volume from `var.availability_zone`, which could differ from the instance subnet and make the attachment fail. I changed the volume to use `data.aws_subnet.jenkins.availability_zone` so the volume is guaranteed to be in the same Availability Zone as the instance subnet.

4. **The original mount logic assumed the attached volume would appear as `/dev/xvdf` inside the guest OS**: On Nitro-based EC2 instances, attached EBS volumes are exposed as NVMe devices and the OS device name can differ from the attachment name. I changed the attachment to `/dev/sdf`, which Amazon Linux maps with a symlink, and updated the bootstrap logic to wait for the device before mounting it.

5. **The original filesystem creation command risked wiping persistent Jenkins data**: `mkfs -t xfs /dev/xvdf || true` could reformat an existing Jenkins data volume during recovery or replacement scenarios. I changed the script to check for an existing filesystem with `blkid`, format only when needed, and mount the volume via its UUID in `/etc/fstab`.

## Review Notes
- The post's `required_providers` block is valid for OpenTofu. Using `source = "hashicorp/aws"` is explicitly supported by the OpenTofu provider requirements documentation.
- The inline `ingress` and `egress` blocks on `aws_security_group` are still valid, but the current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new configurations. I did not change this because the existing syntax still works and the task was to fix only technical errors.
- The post references an Application Load Balancer in the architecture and best-practices sections but does not include the ALB, target group, listener, or certificate resources. That is acceptable for a focused infrastructure excerpt, but readers would still need those resources for a full end-to-end deployment.
- The local review environment did not have the `tofu` CLI installed, so I could not run `tofu validate`. The review was completed by checking the post against the official product and provider documentation above.
