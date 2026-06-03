# Validation Summary: How to Create IAM Roles for EC2 Instance Profiles

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- AWS IAM roles and instance profiles
- Amazon EC2
- AWS STS temporary credentials
- EC2 Instance Metadata Service (IMDS and IMDSv2)
- AWS CLI
- Terraform AWS provider
- Amazon S3, Amazon SQS, AWS Secrets Manager, Amazon CloudWatch

## Sources Consulted
- AWS IAM User Guide: Use an IAM role to grant permissions to applications running on Amazon EC2 instances - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html
- AWS IAM User Guide: Use instance profiles - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html
- Amazon EC2 User Guide: Attach an IAM role to an instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/attach-iam-role.html
- Amazon EC2 User Guide: Configure the Instance Metadata Service options - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html
- Amazon EC2 User Guide: Modify instance metadata options for existing instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-existing-instances.html
- AWS CLI Command Reference: iam create-role, attach-role-policy, put-role-policy, create-instance-profile, add-role-to-instance-profile - https://docs.aws.amazon.com/cli/latest/reference/iam/
- AWS CLI Command Reference: ec2 run-instances, associate-iam-instance-profile, modify-instance-metadata-options - https://docs.aws.amazon.com/cli/latest/reference/ec2/
- Terraform AWS Provider documentation: aws_iam_role, aws_iam_instance_profile, aws_iam_role_policy, aws_iam_role_policy_attachment, aws_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The post stated that EC2 allows both IMDSv1 and IMDSv2 by default. Current EC2 behavior is determined by instance launch settings, account-level settings, and AMI metadata support, so I changed the wording to explain that instances can allow both versions or require IMDSv2 depending on those settings.
- The post stated that credentials become available within a few seconds after attaching an instance profile. AWS documents eventual consistency for instance profile role changes, so I changed the wording to "usually become available shortly after the association propagates" while preserving the no-reboot guidance.

## Review Notes
- The AWS CLI command shapes, IAM trust policy, instance profile workflow, Terraform resource types, and IMDSv2 token commands are technically correct.
- The example ARNs, AMI ID, subnet ID, security group ID, instance ID, and account ID are placeholders and must be replaced before real use.
- Local `aws` and `terraform` binaries were not installed in the review environment, so command validation was performed against official documentation rather than local CLI help.
