# Validation Summary: IAM Policies with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Identity and Access Management (IAM)
- Amazon S3
- Amazon DynamoDB
- OpenTofu / HCL
- Terraform AWS Provider (`hashicorp/aws`)

## Sources Consulted
- OpenTofu string/template and `jsonencode` guidance: https://opentofu.org/docs/language/expressions/strings/
- AWS IAM policy types: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html
- AWS IAM managed vs inline policies: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html
- AWS guidance on choosing managed vs inline policies and least privilege: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-choosing-managed-or-inline.html
- AWS IAM policy management and Access Analyzer guidance: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html
- AWS global condition key `aws:MultiFactorAuthPresent`: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-mfa-present
- Amazon S3 IAM action/resource mapping: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html#security_iam_service-with-iam-id-based-policies-actions
- Amazon S3 service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- AWS managed policy `ReadOnlyAccess`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/ReadOnlyAccess.html
- Terraform AWS Provider `aws_iam_policy` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_policy.html.markdown
- Terraform AWS Provider `aws_iam_role_policy_attachment` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role_policy_attachment.html.markdown
- Terraform AWS Provider `aws_iam_role_policy` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role_policy.html.markdown
- Terraform AWS Provider `aws_iam_policy` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/iam_policy.html.markdown
- Terraform AWS Provider `aws_iam_policy` data source implementation showing `id` is set to the ARN and `policy_id` is the actual policy ID: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/iam/policy_data_source.go

## Issues Found
- The data source example output used `data.aws_iam_policy.admin_policy.id` while naming the output `admin_policy_id`. In the AWS provider, the data source’s internal `id` is the policy ARN, while the documented policy identifier attribute is `policy_id`. I changed the example to `data.aws_iam_policy.admin_policy.policy_id` so the output matches its name and the provider’s documented schema.

## Review Notes
- The remaining examples are syntactically valid for current OpenTofu/Terraform-style HCL and use current AWS provider resources.
- The MFA condition example is technically valid, but in practice a blanket deny policy like this should be applied carefully because it can block programmatic access paths that do not present MFA context.
