# Validation Summary: How to Handle Cross-Account Access Securely in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (AWS Provider)
- AWS IAM (roles, trust policies, identity-based policies)
- AWS STS (AssumeRole, ExternalId)
- AWS Organizations (Service Control Policies)
- AWS CloudTrail
- AWS CloudWatch Logs (metric filters)
- AWS S3 backend for Terraform state
- GitHub Actions (OIDC, `aws-actions/configure-aws-credentials`)

## Sources Consulted
- Terraform AWS provider `assume_role` block reference: https://registry.terraform.io/providers/hashicorp/aws/latest/docs#assume_role
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- `aws_organizations_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy
- `aws_cloudtrail` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- `aws_cloudwatch_log_metric_filter` resource and CloudWatch Logs filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- AWS Account Management IAM actions: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsaccountmanagement.html
- GuardDuty API reference (DisassociateFromAdministratorAccount): https://docs.aws.amazon.com/guardduty/latest/APIReference/API_DisassociateFromAdministratorAccount.html
- AWS confused deputy / external ID guidance: https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html
- `aws-actions/configure-aws-credentials` releases: https://github.com/aws-actions/configure-aws-credentials/releases

## Issues Found
1. **S3 backend `role_arn` (deprecated top-level argument).** The post originally placed `role_arn` directly inside the `backend "s3"` block. In current AWS provider versions this top-level argument is deprecated in favor of the nested `assume_role = { role_arn = ... }` block. Updated the backend block accordingly.

2. **GuardDuty action name (`DisassociateFromMasterAccount`).** AWS replaced the "master account" terminology with "administrator account" and the corresponding API is `guardduty:DisassociateFromAdministratorAccount`. Updated the SCP to reference the current action name.

3. **CloudWatch Logs metric filter substring wildcard syntax.** The original pattern used `"*TerraformAccess*"` as a wrapping-wildcard string match. CloudWatch JSON filter patterns support regex matches via the `%...%` syntax for substring matching, not double-sided `*...*` wildcards. Updated the pattern to `%TerraformAccess%`.

## Review Notes
- The `aws-actions/configure-aws-credentials@v4` action still works, but newer major versions (v6.x) exist. Not a correctness issue, so left unchanged.
- The trust policy comment "Required for third-party access" is slightly imprecise — external IDs originated as a third-party (confused deputy) safeguard but are a generally recommended best practice. The post's "External ID for Confused Deputy Prevention" section already clarifies this, so the inline comment was left as-is.
- The IAM `account:*` namespace is valid (AWS Account Management actions like `account:GetAlternateContact`, `account:ListRegions`).
- Permissions like `ec2:*`, `rds:*`, and `s3:*` are intentionally broad in the examples; the post itself notes that production policies should be tighter, which is acceptable for a teaching example.
