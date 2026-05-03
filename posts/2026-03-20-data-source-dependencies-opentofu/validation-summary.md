# Validation Summary: How to Use Data Source Dependencies in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform AWS Provider (data sources: `aws_subnets`, `aws_iam_policy`, `aws_s3_bucket`, `aws_caller_identity`; resources: `aws_vpc`, `aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_s3_bucket`)
- OpenTofu meta-arguments (`depends_on`, modules, provider aliases)

## Sources Consulted
- OpenTofu Data Sources documentation: https://opentofu.org/docs/language/data-sources/
- OpenTofu `depends_on` meta-argument: https://opentofu.org/docs/language/meta-arguments/depends_on/
- Terraform AWS Provider `aws_iam_policy` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/iam_policy.html.markdown
- Terraform AWS Provider `aws_subnets` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/subnets.html.markdown
- Terraform AWS Provider `aws_s3_bucket` resource: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket.html.markdown
- HashiCorp Provider Configuration documentation: https://developer.hashicorp.com/terraform/language/providers/configuration

## Issues Found
- **Misleading code comment in the explicit `depends_on` example**: The inline comment for `data "aws_iam_policy" "role_policies"` read "This data source looks up the role by name." However, `aws_iam_policy` looks up an IAM policy (by ARN, name, or path_prefix), not a role. Updated the comment to "This data source looks up the policy by ARN." to match what the data source actually does and the `arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"` argument shown.

## Review Notes
- All HCL syntax in the post is valid for OpenTofu, and all referenced data source/resource attributes (e.g., `aws_vpc.main.id`, `aws_s3_bucket.app.bucket`) are correct per the AWS provider documentation.
- The plan-time vs apply-time evaluation behavior is described accurately. The official OpenTofu docs confirm that data sources are deferred to apply when they have `depends_on` or reference values that aren't predictable until apply.
- The provider configuration example (`provider "aws"` with `assume_role.role_arn = aws_iam_role.cross_account.arn`) is syntactically valid and the dependency claim is correct, but readers should be aware of the chicken-and-egg caveat: provider configurations must be evaluable before resources are created, so this pattern only works reliably when the referenced IAM role already exists in state (e.g., from a prior apply or a separate root module). The post's framing — "ensure that provider configuration happens before data source evaluation" — is accurate but does not call out this subtlety. Not a technical error, but a caveat worth keeping in mind.
- The `aws_iam_policy` example with `depends_on = [aws_iam_role_policy_attachment.attach]` is somewhat contrived (the AWS managed policy `ReadOnlyAccess` always exists regardless of the attachment), but it serves to illustrate `depends_on` syntax, which is the section's purpose.
