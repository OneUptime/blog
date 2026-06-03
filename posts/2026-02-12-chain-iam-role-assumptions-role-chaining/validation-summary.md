# Validation Summary: How to Chain IAM Role Assumptions (Role Chaining)

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- AWS IAM roles and trust policies
- AWS STS AssumeRole
- AWS CLI profiles and STS commands
- boto3 for Python
- AWS CloudTrail auditing
- Terraform AWS provider IAM resources

## Sources Consulted
- AWS IAM User Guide: Methods to assume a role - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage-assume.html
- AWS IAM User Guide: Switch to an IAM role (AWS CLI) - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-cli.html
- AWS SDKs and Tools Reference Guide: Assuming a role with AWS credentials - https://docs.aws.amazon.com/sdkref/latest/guide/access-assume-role.html
- AWS SDKs and Tools Reference Guide: Assume role credential provider - https://docs.aws.amazon.com/sdkref/latest/guide/feature-assume-role-credentials.html
- AWS STS API Reference: AssumeRole - https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- AWS CLI Command Reference: aws sts assume-role - https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS IAM User Guide: Pass session tags in AWS STS - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html
- AWS IAM User Guide: Monitor and control actions taken with assumed roles - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_control-access_monitor.html
- Terraform Registry: aws_iam_role - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role

## Issues Found
- The one-hour role chaining limit was stated as applying without caveats. AWS documents that the role chaining session-duration limit does not apply to applications running on EC2 instances using instance profiles, so the post now calls out that exception.
- The session tag section showed `--tags` and `--transitive-tag-keys` examples without noting that the target role trust policy must allow `sts:TagSession`. Added that requirement because `AssumeRole` fails without it when passing session tags.
- The source identity section showed `--source-identity` without noting the required `sts:SetSourceIdentity` permission in the caller permissions and target role trust policy. Added the permission requirement, including the chained-role case.

## Review Notes
The AWS CLI, boto3, IAM trust policy, and Terraform examples are otherwise consistent with current official documentation. The Terraform snippet assumes the referenced provider alias `aws.account_c` is configured elsewhere, which is normal for a focused example.
