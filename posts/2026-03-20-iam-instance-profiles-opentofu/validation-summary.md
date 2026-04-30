# Validation Summary: How to Create IAM Instance Profiles with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- AWS IAM roles and instance profiles
- Amazon EC2
- EC2 Instance Metadata Service (IMDSv2)
- AWS Systems Manager
- Amazon CloudWatch Agent
- Amazon S3
- Amazon SQS
- AWS Secrets Manager
- AWS CLI

## Sources Consulted
- OpenTofu `tofu init` command docs: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `tofu plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` command docs: https://opentofu.org/docs/cli/commands/apply/
- AWS provider docs: `aws_iam_role` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS provider docs: `aws_iam_role_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- AWS provider docs: `aws_iam_instance_profile` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile
- AWS provider docs: `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider docs: `aws_launch_template` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS IAM docs: Use instance profiles: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html
- Amazon EC2 docs: IAM roles for Amazon EC2: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html
- Amazon EC2 docs: Use the Instance Metadata Service to access instance metadata: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- Amazon EC2 docs: Configure the Instance Metadata Service options: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html
- AWS Systems Manager managed policies: https://docs.aws.amazon.com/systems-manager/latest/userguide/security-iam-awsmanpol.html
- AWS managed policy reference for `CloudWatchAgentServerPolicy`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html
- AWS Secrets Manager identity-based policy examples: https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_iam-policies.html
- AWS IAM S3 read/write policy example: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_s3_rw-bucket.html
- AWS CLI `sts get-caller-identity`: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- AWS CLI `s3 ls`: https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html

## Issues Found
- The conclusion said IMDSv2 would "prevent SSRF attacks" from reaching instance credentials. AWS documents IMDSv2 as adding defense in depth and protections against SSRF and related proxy/firewall issues, which is more precise than an absolute prevention claim. Updated that sentence to match AWS guidance.

## Review Notes
- The OpenTofu resource syntax and argument names used in the post are current and valid for the documented AWS provider resources.
- The `aws_iam_role_policy` example uses `aws_iam_role.app_server.id` for the `role` argument. This is valid because the AWS provider exports the IAM role `id` as the role name.
- The `http_put_response_hop_limit = 1` setting is valid. AWS notes that containerized workloads may require a higher hop limit, but this post's EC2 application-server example is still technically correct as written.
- Assigning an instance profile during instance launch also requires the caller to have `iam:PassRole`. The post's prerequisite of IAM and EC2 permissions is directionally correct, but implementers should ensure `iam:PassRole` is included in practice.
- The snippets reference supporting variables and data sources that are not fully declared in this post. That is acceptable for a focused infrastructure example and does not make the demonstrated IAM instance-profile pattern incorrect.
