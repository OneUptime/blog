# Validation Summary: How to Create AWS SSO Permission Sets with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS IAM Identity Center
- AWS IAM Identity Center Identity Store
- AWS IAM managed policies
- Amazon EC2
- Amazon RDS

## Sources Consulted
- OpenTofu: Basic CLI Features - https://opentofu.org/docs/cli/commands/
- OpenTofu: Initializing Working Directories - https://opentofu.org/docs/cli/init/
- OpenTofu: Command: apply - https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform Registry: `aws_ssoadmin_instances` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssoadmin_instances
- Terraform Registry: `aws_ssoadmin_permission_set` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_permission_set
- Terraform Registry: `aws_ssoadmin_managed_policy_attachment` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_managed_policy_attachment
- Terraform Registry: `aws_ssoadmin_permission_set_inline_policy` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_permission_set_inline_policy
- Terraform Registry: `aws_identitystore_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/identitystore_group
- Terraform Registry: `aws_ssoadmin_account_assignment` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_account_assignment
- AWS IAM Identity Center User Guide: Create, manage, and delete permission sets - https://docs.aws.amazon.com/singlesignon/latest/userguide/permissionsets.html
- AWS IAM Identity Center User Guide: Create a permission set - https://docs.aws.amazon.com/singlesignon/latest/userguide/howtocreatepermissionset.html
- AWS IAM Identity Center User Guide: Set session duration for AWS accounts - https://docs.aws.amazon.com/singlesignon/latest/userguide/howtosessionduration.html
- AWS IAM Identity Center User Guide: Organization and account instances of IAM Identity Center - https://docs.aws.amazon.com/singlesignon/latest/userguide/identity-center-instances.html
- AWS IAM Identity Center User Guide: IAM Identity Center Region data storage and operations - https://docs.aws.amazon.com/singlesignon/latest/userguide/regions.html
- AWS Managed Policy Reference: PowerUserAccess - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/PowerUserAccess.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon EC2 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS IAM User Guide: Amazon RDS tag-owner policy example - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_rds_tag-owner.html

## Issues Found
- The prerequisites were missing the requirement that the AWS provider target the same Region where IAM Identity Center is enabled. I added that because IAM Identity Center permission sets, assignments, and identity store data are regional.
- The developer permission set comment described `PowerUserAccess` as if it were limited to EC2, S3, and Lambda. I corrected that wording to reflect AWS's documented definition of `PowerUserAccess` as broad AWS service access without IAM user and group administration.
- The inline deny example used `aws:ResourceTag/Environment` for `rds:DeleteDBInstance`. I changed the RDS statement to use the documented RDS DB-instance tag condition key `rds:db-tag/Environment`, while keeping the EC2 statement on `aws:ResourceTag/Environment`.
- The conclusion described the inline policy as a generic production-resource-termination guardrail. I narrowed that wording so it matches the exact example shown: denying EC2 instance termination and RDS DB instance deletion.

## Review Notes
- No remaining technical issues were found after the fixes.
- The post is correctly aimed at an IAM Identity Center organization instance. AWS documents that permission sets are an organization-instance feature for multi-account access.
- The AWS provider documentation recommends an explicit `depends_on` relationship between `aws_ssoadmin_managed_policy_attachment` and `aws_ssoadmin_account_assignment` when they are used together for the same permission set, to ensure clean destroy ordering. The post's create/apply flow is valid, but that lifecycle caveat is worth keeping in mind.
