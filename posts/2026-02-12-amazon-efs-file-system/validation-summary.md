# Validation Summary: How to Create an Amazon EFS File System

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Elastic File System (EFS)
- Amazon Elastic Block Store (EBS)
- AWS CLI
- Amazon EC2 security groups
- AWS Identity and Access Management (IAM) resource-based policies
- AWS CloudFormation
- Terraform AWS provider

## Sources Consulted
- AWS CLI Command Reference: `aws efs create-file-system` - https://docs.aws.amazon.com/cli/latest/reference/efs/create-file-system.html
- AWS CLI Command Reference: `aws efs create-mount-target` - https://docs.aws.amazon.com/cli/latest/reference/efs/create-mount-target.html
- AWS CLI Command Reference: `aws ec2 authorize-security-group-ingress` - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon EFS User Guide: Creating EFS file systems - https://docs.aws.amazon.com/efs/latest/ug/creating-using-create-fs.html
- Amazon EFS User Guide: Managing mount targets - https://docs.aws.amazon.com/efs/latest/ug/accessing-fs.html
- Amazon EFS User Guide: Using IAM to control access to file systems - https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html
- Amazon EFS User Guide: Resource-based policy examples - https://docs.aws.amazon.com/efs/latest/ug/security_iam_resource-based-policy-examples.html
- Amazon EFS User Guide: Performance specifications and throughput modes - https://docs.aws.amazon.com/efs/latest/ug/performance.html
- Amazon EFS pricing - https://aws.amazon.com/efs/pricing/
- AWS CloudFormation Template Reference: `AWS::EFS::FileSystem` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-efs-filesystem.html
- Terraform Registry: `aws_efs_file_system` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system
- Terraform Registry: `aws_efs_mount_target` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_mount_target
- Amazon EBS User Guide: EBS Multi-Attach - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes-multi.html

## Issues Found
- The introductory EBS comparison said EBS volumes are tied to a single EC2 instance. This is generally true for most EBS volumes, but EBS Multi-Attach supports specific Provisioned IOPS SSD volumes attached to multiple Nitro instances in the same Availability Zone. I updated the sentence to include that limitation.
- The file system policy example claimed to enforce encryption in transit and prevent anonymous access, but the second deny statement used an access-point condition that did not accurately represent AWS's documented "prevent anonymous access" behavior. I removed that statement and clarified that a custom file system policy removes the default anonymous full-access policy, while IAM client permissions and IAM authorization should be used for clients that need access.
- The conclusion called `generalPurpose`, `bursting`, and `encrypted` the "defaults." AWS CLI defaults differ from console recommended settings, and encryption is explicitly selected in the example rather than being an AWS CLI default. I changed the wording to call these the settings used in the guide.

## Review Notes
- The AWS CLI command syntax, CloudFormation resource property names, and Terraform resource arguments are current and valid.
- AWS currently recommends Elastic throughput in the EFS console quick-create flow, while the CLI and Terraform snippets intentionally select Bursting throughput. Bursting remains a valid throughput mode, but Elastic may be a better default choice for some new workloads.
