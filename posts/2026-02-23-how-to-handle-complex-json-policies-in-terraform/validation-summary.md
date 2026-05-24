# Validation Summary: How to Handle Complex JSON Policies in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS Provider for Terraform (`hashicorp/aws`)
- AWS IAM policies / policy documents
- `aws_iam_policy_document` data source
- `aws_iam_role_policy` resource
- Terraform built-in functions: `jsonencode()`, `templatefile()`, `jsondecode()`, `can()`, `title()`
- Terraform template directives (`%{ if }` / `%{ endif }`)
- AWS condition keys (`aws:SourceVpce`, `aws:CurrentTime`, `s3:x-amz-server-side-encryption`, `aws:RequestedRegion`)

## Sources Consulted
- [IAM and AWS STS quotas, name requirements, and character limits](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html)
- [AWS Global Condition Context Keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html)
- [Terraform `aws_iam_policy_document` data source](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document)
- [Terraform `title()` function](https://developer.hashicorp.com/terraform/language/functions/title)
- [Terraform string templates and directives](https://developer.hashicorp.com/terraform/language/expressions/strings)
- [Terraform `jsonencode()` function](https://developer.hashicorp.com/terraform/language/functions/jsonencode)
- [Terraform `templatefile()` function](https://developer.hashicorp.com/terraform/language/functions/templatefile)
- AWS provider GitHub issues #17555 and #22906 (deprecation/removal history of `source_json` / `override_json`)

## Issues Found
1. **Incorrect IAM policy size limits in "Performance Considerations"**
   - The post claimed "Inline policy: 2,048 characters (URL-encoded)" and "Managed policy: 6,144 characters (JSON)".
   - The 2,048-character figure applies only to inline policies on IAM **users**. Inline policies on **roles** (which the rest of the post uses via `aws_iam_role_policy`) are limited to **10,240** characters, and inline policies on **groups** are limited to **5,120** characters. Also, the AWS documentation states the limit is calculated excluding whitespace — "URL-encoded" is not the correct qualifier.
   - Fixed: replaced the bullet list with the correct per-entity limits and changed "URL-encoded" to "whitespace is not counted". Also disambiguated "Managed policy" to "Customer-managed policy".

2. **Incorrect casing of `aws:sourceVpce` condition key**
   - The post used `aws:sourceVpce` (lowercase `s`). AWS documents this global condition key as `aws:SourceVpce` (capital `S`, capital `V`).
   - Fixed: updated to `aws:SourceVpce` to match the documented form.

## Review Notes
- `source_policy_documents` and `override_policy_documents` (plural list forms) are the current, correct attributes — the singular `source_json` / `override_json` were deprecated in AWS provider v4.0 and removed in v5.0. The post uses the modern forms.
- The `// policies/complex-policy.json.tpl` line at the top of the template code block is a file-path label, not part of the file. A reader who literally copies the entire block into a `.json.tpl` file would produce invalid JSON, but this is a common documentation convention and the surrounding prose makes the intent clear.
- The "Validating JSON Policies" example uses `length(var.inline_policy) <= 10240`, which matches the role inline policy limit — now consistent with the updated Performance Considerations section.
- The `aws:CurrentTime` condition uses `DateGreaterThan` with `2025-12-31T23:59:59Z`, which is in the past relative to the current date (2026-05-24). The example would now match all times, which inverts the intended "after a deadline" semantics. This is illustrative example code so I did not change it, but readers should pick a future date when adapting.
