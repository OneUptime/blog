# Validation Summary: How to Create IAM Permission Boundaries in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Terraform AWS Provider (`aws_iam_policy`, `aws_iam_role`, `aws_iam_user`, `aws_iam_role_policy_attachment`, `aws_caller_identity`)
- AWS IAM (Permission Boundaries, Managed Policies, Conditions)
- AWS IAM Service Actions (iam, s3, dynamodb, lambda, logs, cloudwatch, sqs, sns, events, apigateway, ssm, secretsmanager, xray, kms, ec2, rds, organizations, account)

## Sources Consulted
- AWS IAM Permission Boundaries documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS IAM Condition Keys reference (iam:PermissionsBoundary): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- Terraform AWS Provider `aws_iam_role` documentation (permissions_boundary argument): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS Provider `aws_iam_user` documentation (permissions_boundary argument): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user
- Terraform AWS Provider `aws_iam_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- AWS IAM Actions reference (PutRolePermissionsBoundary, DeleteRolePermissionsBoundary): https://docs.aws.amazon.com/IAM/latest/APIReference/
- AWS delegated administration pattern documentation

## Issues Found
No technical issues found.

All Terraform resources, arguments, and AWS IAM actions/conditions used in the post are valid and correctly applied:
- The `permissions_boundary` argument is correctly used on both `aws_iam_role` and `aws_iam_user`.
- The `iam:PermissionsBoundary` condition key is correctly used in IAM conditions to require a boundary when creating roles.
- The explanation that effective permissions are the intersection of identity-based policies and the permission boundary is accurate.
- The deny statements for `iam:PutRolePermissionsBoundary` / `iam:DeleteRolePermissionsBoundary` to prevent boundary removal are correctly implemented.
- The delegated administration pattern (developers can create roles only if a boundary is attached) is a recognized AWS best practice.
- The Terraform syntax (jsonencode, for_each, data sources, variable maps) is correct and current.
- The AmazonS3FullAccess managed policy ARN (`arn:aws:iam::aws:policy/AmazonS3FullAccess`) is correct.

## Review Notes
- In the basic boundary example, the `AllowIAMWithBoundary` statement uses a hardcoded account ID placeholder (`123456789012`). The reader will need to substitute their own account ID. Using `${data.aws_caller_identity.current.account_id}` (as shown later in the post) would be cleaner, but the placeholder is conventional in AWS documentation and not a technical error.
- The `developer_boundary` policy's `DenyBoundaryChanges` statement only denies the role-related boundary actions (`iam:DeleteRolePermissionsBoundary`, `iam:PutRolePermissionsBoundary`) but does not deny the user-related equivalents (`iam:DeleteUserPermissionsBoundary`, `iam:PutUserPermissionsBoundary`). Since the same boundary is also applied to a user in a later example, including the user-level deny actions would be a more complete protection. This is an enhancement, not a correctness issue.
- The `developer_admin` policy allows `iam:CreatePolicy` for `app-*` policies, while the `app_boundary` denies `iam:CreatePolicy`. This is intentional and correct because the boundary applies to roles created by the developer, not to the developer's own identity. The pattern works as intended.
- The post is consistent with current Terraform AWS provider (v5.x) syntax and AWS IAM features. No deprecation concerns at the time of review.
