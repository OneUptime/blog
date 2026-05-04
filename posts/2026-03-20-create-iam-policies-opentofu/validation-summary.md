# Validation Summary: How to Create IAM Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- AWS IAM (Identity and Access Management)
- AWS Provider for Terraform/OpenTofu (`hashicorp/aws`)
- HCL (HashiCorp Configuration Language)
- AWS S3 and CloudWatch Logs (referenced in examples)

## Sources Consulted
- Terraform AWS Provider — `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Terraform AWS Provider — `aws_iam_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- Terraform AWS Provider — `aws_iam_role_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- Terraform AWS Provider — `aws_iam_role_policy_attachment` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- AWS IAM JSON Policy Reference (Version `2012-10-17`): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_grammar.html
- AWS Global Condition Context Keys (`aws:RequestedRegion`): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS Managed Policy ARNs (e.g. `arn:aws:iam::aws:policy/ReadOnlyAccess`): https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html
- OpenTofu documentation (compatibility with Terraform AWS provider): https://opentofu.org/docs/

## Issues Found
No technical issues found.

All code samples are syntactically valid HCL and use the current, non-deprecated AWS provider resources and data sources:

- The `aws_iam_policy_document` data source uses correct argument names (`statement`, `effect`, `actions`, `resources`, `condition` with `test`/`variable`/`values`).
- The `aws_iam_policy` resource correctly uses `name`, `description`, and `policy` arguments.
- The `aws_iam_role_policy_attachment` resource correctly takes `role` (role name) and `policy_arn`.
- The `aws_iam_role_policy` inline-policy resource correctly accepts `name`, `role`, and `policy`. Using `aws_iam_role.app.id` is valid because in the AWS provider the role's `id` attribute is the role name.
- The IAM policy `Version` value `"2012-10-17"` is the current correct policy language version.
- `aws:RequestedRegion` is a valid AWS global condition key.
- The AWS managed policy ARN `arn:aws:iam::aws:policy/ReadOnlyAccess` is correct.
- The CloudWatch Logs resource ARN pattern `arn:aws:logs:*:*:*` is a valid wildcard form.

## Review Notes
- For tighter security posture, real-world examples would typically scope log resources to a specific region/account/log group rather than `arn:aws:logs:*:*:*`, and avoid `s3:*` on `*` resources, but these are illustrative snippets and are not technically incorrect.
- The post does not pin a provider version. Readers using very old AWS provider versions (pre-2.x) may see slightly different behavior, but the resources shown have been stable for many years and are current as of the AWS provider 5.x line.
- OpenTofu is fully compatible with the `hashicorp/aws` provider used here, so all examples apply equivalently to OpenTofu and Terraform.
