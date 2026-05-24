# Validation Summary: How to Handle IAM Policy Size Limits in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL configuration language)
- AWS IAM (Identity and Access Management)
- AWS IAM managed policies, inline policies, and trust policies
- AWS resources: S3, DynamoDB, SQS, SNS, CloudWatch Logs
- Terraform `jsonencode` function
- Terraform `aws_iam_policy`, `aws_iam_role_policy_attachment`, `aws_iam_role_policy`, `aws_iam_policy_document` data source

## Sources Consulted
- AWS IAM quotas documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html
- AWS IAM character limits: managed policy 6,144; inline role policy 10,240; inline user policy 2,048; inline group policy 5,120; trust policy 2,048 (adjustable to 4,096)
- AWS managed policies per role quota: default 10, adjustable to 20
- Terraform AWS provider docs for `aws_iam_policy`, `aws_iam_role_policy`, `aws_iam_role_policy_attachment`, `aws_iam_policy_document` data source
- Terraform `jsonencode` function documentation (produces compact JSON output)
- AWS IAM JSON policy element reference (Version, Statement, Effect, Action, Resource, Condition)
- AWS STS AssumeRole and PrincipalTag condition keys

## Issues Found
No technical issues found. All policy size limits cited in the post (6,144 / 10,240 / 2,048 / 5,120 / 4,096) match AWS documentation. The Terraform resource names, attributes, and syntax are correct. The `jsonencode` claim about compact output is accurate. The trust policy with `aws:PrincipalTag` condition is syntactically valid. The `LimitExceeded` error reference is consistent with what IAM returns when policy size is exceeded.

## Review Notes
- The `for_each = toset([aws_iam_policy.x.arn, ...])` pattern in Strategy 1 and Strategy 5 can sometimes hit the well-known Terraform limitation that `for_each` keys must be known at plan time. In practice this often works when the resources can be planned together, but readers using this pattern on entirely new infrastructure may occasionally need to apply in two phases or use `toset` with resource references that can be statically determined. This is a Terraform-wide caveat rather than an error in the post.
- The `null_resource` with `local-exec` provisioner in Strategy 7 only runs on first creation of that resource, so the size warning will not re-fire on subsequent applies unless the resource is tainted/recreated. The technique is illustrative; a `precondition` check or external CI script may be more reliable for ongoing monitoring.
- The post correctly notes that wildcards must be used cautiously with safe naming conventions to avoid over-permissive grants.
- Trust policy character limit was increased to 4,096 in 2022 (the post mentions this correctly as a quota-increase option).
