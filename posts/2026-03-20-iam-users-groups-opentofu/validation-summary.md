# Validation Summary: How to Manage IAM Users and Groups with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Identity and Access Management (IAM)
- AWS Secrets Manager
- IAM policy JSON

## Sources Consulted
- OpenTofu Strings and Templates: https://opentofu.org/docs/language/expressions/strings/
- Terraform AWS Provider `aws_iam_user`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_user.html.markdown
- Terraform AWS Provider `aws_iam_access_key`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_access_key.html.markdown
- Terraform AWS Provider `aws_iam_account_password_policy`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_account_password_policy.html.markdown
- Terraform AWS Provider `aws_iam_group_policy`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_group_policy.html.markdown
- Terraform AWS Provider `aws_iam_user_group_membership`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_user_group_membership.html.markdown
- Terraform AWS Provider `aws_iam_policy_document`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/iam_policy_document.html.markdown
- AWS IAM tag-based access control guidance: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_tags.html
- AWS Service Authorization Reference for Amazon EC2: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS Service Authorization Reference for Amazon RDS: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonrds.html
- Amazon S3 bucket tagging and ABAC: https://docs.aws.amazon.com/AmazonS3/latest/userguide/buckets-tagging.html
- AWS MFA self-service policy example: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_my-sec-creds-self-manage-mfa-only.html
- AWS IAM self-managed MFA example: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_iam_mfa-selfmanage.html
- AWS account password policy docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html

## Issues Found
- The developer group example claimed "full access to dev" with a single `aws:ResourceTag/Environment=dev` condition across `ec2:*`, `s3:*`, and `rds:*`. That was too broad and not reliably correct because AWS documents service/action support for resource-level permissions and condition keys individually, and S3 general purpose bucket ABAC also requires explicit enablement. I replaced it with a narrower EC2 instance lifecycle example using actions documented as supporting `aws:ResourceTag`.
- The MFA policy used `&{aws:username}` inside `jsonencode`. That escape syntax is documented for the `aws_iam_policy_document` data source, not for raw strings passed through `jsonencode`. I corrected the example to emit literal AWS policy variables using `$${aws:username}`.
- The MFA policy description said it exempted "credential management," but the actual actions shown only covered MFA self-service and did not match AWS's current self-manage-MFA policy examples. I replaced the policy body with a doc-aligned MFA self-service pattern that includes the required self-management actions and the correct `NotAction` exception list.
- The `hard_expiry = false` comment said "Don't lock out - warn instead," which was imprecise. AWS/password-policy docs indicate this setting allows users to reset expired passwords themselves rather than requiring an administrator reset. I corrected the comment.
- The conclusion recommended rotating access keys "with a version suffix" on the `aws_iam_access_key` resource, which is not a provider feature or documented rotation mechanism. I removed that inaccurate implementation detail and kept the general rotation guidance.

## Review Notes
- `aws_iam_access_key.cicd.secret` is written to state when used directly, even if you also copy it into Secrets Manager. The provider documentation calls this out explicitly, so state protection remains important for this pattern.
