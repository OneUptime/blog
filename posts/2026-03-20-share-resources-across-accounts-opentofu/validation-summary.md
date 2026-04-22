# Validation Summary: How to Share Resources Across Accounts with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS provider for Terraform/OpenTofu
- AWS Resource Access Manager (RAM)
- Amazon VPC subnet sharing
- Amazon EC2 AMI launch permissions
- Amazon S3 bucket policies
- AWS Key Management Service (KMS) key policies
- AWS IAM cross-account permissions

## Sources Consulted
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- AWS RAM sharing with AWS Organizations: https://docs.aws.amazon.com/ram/latest/userguide/getting-started-sharing.html
- AWS RAM resource share invitations: https://docs.aws.amazon.com/ram/latest/userguide/working-with-shared-invitations.html
- AWS RAM shareable resources: https://docs.aws.amazon.com/ram/latest/userguide/shareable.html
- HashiCorp AWS provider `aws_ram_resource_share` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ram_resource_share.html.markdown
- HashiCorp AWS provider `aws_ram_resource_association` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ram_resource_association.html.markdown
- HashiCorp AWS provider `aws_ram_principal_association` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ram_principal_association.html.markdown
- HashiCorp AWS provider `aws_ram_resource_share_accepter` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ram_resource_share_accepter.html.markdown
- HashiCorp AWS provider `aws_ami_launch_permission` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ami_launch_permission.html.markdown
- HashiCorp AWS provider `aws_s3_bucket_policy` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_policy.html.markdown
- HashiCorp AWS provider `aws_kms_key` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kms_key.html.markdown
- AWS IAM `Principal` policy element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS IAM cross-account resource access documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html
- AWS KMS cross-account key usage documentation: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
- Amazon EC2 AMI sharing documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/sharingamis-explicit.html

## Issues Found
- The introduction listed "VPCs" and "Route 53 zones" as shareable resources. AWS RAM supports sharing VPC subnets and Route 53 resources such as Resolver rules, not whole VPCs or hosted zones in the way the wording implied. Updated the examples to "VPC subnets" and "Route 53 Resolver rules."
- The production account section used `aws_ram_resource_share_accepter` for an AWS Organizations subnet share. AWS RAM does not send invitations for same-organization shares when RAM sharing with AWS Organizations is enabled, and the AWS provider docs state the accepter resource is not needed in that case. Replaced the accepter snippet with the correct automatic-access explanation.
- The S3 bucket policy example did not mention that cross-account access also needs an identity-based IAM policy in the consuming account. Added a short note after the snippet.
- The KMS key policy example did not mention that cross-account KMS use requires both the key policy in the owner account and an IAM policy in the external account. Added a short note after the snippet and updated the conclusion to include consumer-account IAM permissions.

## Review Notes
- The remaining OpenTofu/HCL resource names and arguments match current AWS provider documentation.
- The snippets assume referenced variables, IAM roles, subnets, buckets, and AMIs already exist.
- For encrypted AMIs, the target account also needs access to the customer managed KMS key used by the backing snapshots; AMIs encrypted with AWS managed keys cannot be shared directly.
