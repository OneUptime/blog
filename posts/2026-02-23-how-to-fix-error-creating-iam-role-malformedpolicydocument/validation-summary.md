# Validation Summary: How to Fix Error Creating IAM Role MalformedPolicyDocument

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HCL syntax, `jsonencode`, heredocs, `terraform console`)
- AWS IAM (roles, trust policies, permission policies, principals, ARN format)
- AWS STS (`sts:AssumeRole`, `sts:AssumeRoleWithSAML`, `sts:AssumeRoleWithWebIdentity`, `sts:ExternalId`)
- AWS service principals (EC2, Lambda, ECS, EMR)

## Sources Consulted
- AWS IAM JSON policy reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies.html
- AWS IAM JSON policy elements - Principal: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS IAM JSON policy elements - Version: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_version.html
- AWS service principals reference (e.g. `elasticmapreduce.amazonaws.com`, `ecs-tasks.amazonaws.com`)
- Terraform AWS provider documentation: `aws_iam_role`, `aws_iam_role_policy_attachment` resources
- Terraform `jsonencode` function documentation
- AWS STS API reference for AssumeRole, AssumeRoleWithSAML, AssumeRoleWithWebIdentity

## Issues Found
No technical issues found.

All technical claims, code samples, and configurations were verified against official AWS and Terraform documentation:

- The three AWS error message variants ("Has prohibited field Resource", "Invalid principal in policy", "Syntax errors in policy") are real AWS IAM responses.
- The distinction between trust policy (`assume_role_policy`) and permission policy is accurate; trust policies cannot include `Resource` and must include `Principal`.
- All listed AWS service principal exact names are correct (`ec2.amazonaws.com`, `lambda.amazonaws.com`, `ecs-tasks.amazonaws.com`, `elasticmapreduce.amazonaws.com`).
- The set of permissible STS actions in a trust policy (`sts:AssumeRole`, `sts:AssumeRoleWithSAML`, `sts:AssumeRoleWithWebIdentity`) is correct.
- All `Principal` formats shown (Service string, Service list, AWS ARN, `"*"` wildcard) are valid IAM syntax.
- The HCL/Terraform syntax in all `aws_iam_role` and `aws_iam_role_policy_attachment` examples is valid.
- The cross-account role example using `sts:ExternalId` under `StringEquals` is the canonical AWS-recommended pattern.
- `Version = "2012-10-17"` is correct (and `2008-10-17` is the legacy version, properly flagged as outdated).
- The `jsonencode()` recommendation over heredoc JSON aligns with current Terraform best practice.

## Review Notes
- The claim that "AWS validates that the principal exists when you create the trust policy" is accurate for IAM user/role ARNs — AWS converts them to internal unique IDs at save time, which is why nonexistent IAM principals are rejected. For account-root principals (`:root`) AWS validates the account ID format. Acceptable simplification.
- The `Version` field technically defaults to `2008-10-17` if omitted, rather than being strictly required at the API level. However, treating it as "required" is consistent with AWS best-practice guidance and avoids confusing readers; the recommendation is sound.
- Note: `sts:TagSession` and `sts:SetSourceIdentity` are also valid trust-policy actions used in session-tagging scenarios. The post focuses on the three most common, which is appropriate scope for a troubleshooting guide.
- The AWS IAM Policy Simulator (mentioned in Debugging Tips) is primarily for testing whether actions are allowed, not for JSON syntax validation; however, the post also recommends "a JSON validator" alongside it, so the guidance is workable. AWS IAM Access Analyzer policy validation could be a stronger recommendation for future revisions.
