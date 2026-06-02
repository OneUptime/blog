# Validation Summary: How to Set Up Cross-Account IAM Roles for Shared Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- AWS Security Token Service (STS)
- AWS Organizations
- Amazon S3
- Amazon DynamoDB
- Amazon ECS
- AWS CloudTrail
- GitHub Actions OIDC
- Terraform AWS provider
- Python boto3

## Sources Consulted
- AWS IAM tutorial: Delegate access across AWS accounts using IAM roles: https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html
- AWS IAM cross-account resource access: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html
- AWS CLI `iam create-role` command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-role.html
- AWS CLI `sts assume-role` command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- boto3 STS `assume_role` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/sts/client/assume_role.html
- AWS IAM global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM policy variables: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html
- AWS IAM session tags: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html
- AWS CloudTrail S3 bucket policy guidance: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials
- GitHub Actions OIDC with AWS: https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- AWS Security Hub Organizations integration: https://docs.aws.amazon.com/securityhub/latest/userguide/designate-orgs-admin-account.html
- Amazon GuardDuty Organizations integration: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_organizations.html
- Terraform `aws_iam_role` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform `jsonencode` and `merge` functions: https://developer.hashicorp.com/terraform/language/functions/jsonencode and https://developer.hashicorp.com/terraform/language/functions/merge

## Issues Found
- The cross-account pattern listed only the trust policy and source identity policy. Added a note that the target role also needs a permissions policy for the resources it will access.
- The centralized logging section implied that CloudTrail and VPC Flow Logs normally use this `AssumeRole` pattern. Changed the wording to clarify that those AWS services typically use service-specific delivery principals and resource policies.
- The centralized logging S3 prefix policy used `${aws:PrincipalAccount}`, which would refer to the account of the principal making the S3 request and does not reliably preserve the original source account after assuming a shared target role. Replaced it with a session-tag pattern using `sts:TagSession`, `aws:RequestTag/sourceAccount`, and `${aws:PrincipalTag/sourceAccount}`.
- The GitHub Actions deployment workflow attempted to assume target account roles directly even though the target trust policy trusted a central `CICD-PipelineRole`. Added the missing source-role permission and updated the workflow to assume the central DevOps role first, then use role chaining for the target deployment roles.
- The security audit section said Security Hub and GuardDuty use exactly the shown audit-role pattern. Changed it to clarify that the role pattern is useful for human/tooling audit access, while Security Hub and GuardDuty use AWS Organizations delegated administrator integrations.
- The AWS Organizations section mentioned SCPs as part of simplified trust and described organization conditions as categorically more secure than account IDs. Updated it to state that SCPs are guardrails, organization conditions are used in trust/resource policies, and broad organization trust should be paired with scoped principals or additional conditions.
- The Terraform module emitted an empty `Condition` object when `org_id` was unset. Reworked the `assume_role_policy` expression with `merge` so `Condition` is omitted unless needed.

## Review Notes
- The AWS CLI could not be checked locally because the `aws` executable is not installed in this environment; command syntax was validated against the official AWS CLI documentation instead.
- The existing OneUptime link to the IAM credential reports guide returned HTTP 200.
- The examples are intentionally illustrative and use placeholder account IDs, bucket names, table names, and role names. Real deployments still need account-specific trust policies, resource policies where required, and least-privilege permissions.
