# Validation Summary: How to Debug Data Source Read Failures in OpenTofu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- OpenTofu (data sources, `depends_on`, `count`, `try()`, `TF_LOG`)
- HashiCorp Configuration Language (HCL)
- AWS provider (`aws_vpc`, `aws_security_group`, `aws_ami`, `aws_s3_bucket`, `aws_iam_role`, `aws_iam_policy`)
- AWS CLI (`aws ec2 describe-vpcs`)
- IAM permissions for read actions

## Sources Consulted
- OpenTofu `try()` documentation: https://opentofu.org/docs/language/functions/try/
- OpenTofu debugging / `TF_LOG`: https://opentofu.org/docs/internals/debugging/
- OpenTofu data sources (`depends_on` meta-argument): https://opentofu.org/docs/language/data-sources/
- AWS provider `aws_vpc` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc
- AWS provider `aws_security_group` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_group
- AWS provider `aws_ami` / `aws_iam_policy` data sources (registry docs)
- AWS IAM Service Authorization Reference (EC2, S3, IAM action lists)
- AWS tagging guidance: https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html

## Issues Found
- **Fix 3 — `try()` cannot catch data source read failures.** The original section claimed `try()` (or `lookup()`) could be used to fall back when a data source like `aws_ami` finds no matches. Per the OpenTofu docs, `try()` only suppresses *dynamic expression evaluation* errors. Data source read failures are surfaced during the read phase, before any expression referencing the data source is evaluated, so the plan aborts before `try()` ever runs. The example `try(data.aws_ami.custom.id, data.aws_ami.amazon_linux.id)` would not work as described. I rewrote the section to use a conditional `count`-based pattern driven by a `var.use_custom_ami` flag, with the fallback chosen in a `local`. This preserves the section's intent (graceful handling) while being technically accurate. I also removed the stray "Null resource as a fallback" comment, which referred to nothing in the snippet.

## Review Notes
- `TF_LOG=DEBUG` is correct for OpenTofu — OpenTofu intentionally inherits the `TF_LOG` family of environment variables (no `TOFU_LOG` / `OPENTOFU_LOG`).
- `depends_on` on `data` blocks is supported in OpenTofu (inherited from Terraform 0.13+).
- AWS tag keys/values are case-sensitive, so the Fix 1 guidance is correct.
- The `aws_security_group` data source supports a `filter` block with `name = "group-name"`, mapping to the underlying `DescribeSecurityGroups` API field.
- Fix 5's second example (a managed `aws_iam_policy.readonly` resource alongside a `data "aws_iam_policy" "readonly"` lookup with `depends_on`) is syntactically valid — resources and data sources occupy separate namespaces — but it is a slightly contrived pattern; in most real cases you would reference the managed resource directly rather than re-reading it via a data source. No change made because the syntax is correct and the example illustrates the `depends_on` mechanic the section is teaching.
- The S3 data source minimum permissions listed (`s3:GetBucketLocation`, `s3:ListBucket`) are accurate for the basic read; full attribute population (e.g., versioning, lifecycle) can require additional `s3:GetBucket*` permissions, but that's an extension, not an error.
