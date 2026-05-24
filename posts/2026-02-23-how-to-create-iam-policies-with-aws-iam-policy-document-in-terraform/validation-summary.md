# Validation Summary: How to Create IAM Policies with aws_iam_policy_document in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS IAM (Identity and Access Management)
- AWS Provider for Terraform (hashicorp/aws)
- `aws_iam_policy_document` data source
- `aws_iam_policy` and `aws_iam_role` resources
- IAM JSON policy language (Version 2012-10-17)
- Terraform dynamic blocks and `for_each`

## Sources Consulted
- HashiCorp AWS Provider `aws_iam_policy_document` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- HashiCorp AWS Provider source documentation (GitHub): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/iam_policy_document.html.markdown
- AWS IAM JSON Policy Elements Reference (Effect, Action, NotAction, Resource, NotResource, Principal, Condition)
- AWS IAM Global Condition Keys (`aws:MultiFactorAuthPresent`, `aws:SourceIp`, `sts:ExternalId`)
- Terraform `dynamic` blocks documentation
- Terraform built-in functions (`title`, `replace`, `jsonencode`)

## Issues Found
No technical issues found.

The post is technically accurate. Verified items:

- The `statement` block accepts the documented fields: `sid`, `effect`, `actions`, `not_actions`, `resources`, `not_resources`, `principals`, `not_principals`, and `condition`.
- The `condition` block uses the correct keys (`test`, `variable`, `values`). The condition keys used (`aws:MultiFactorAuthPresent` with `Bool`, `aws:SourceIp` with `IpAddress`, `sts:ExternalId` with `StringEquals`) are valid AWS global condition context keys and operators.
- Principal types listed (`Service`, `AWS`, `Federated`, `*`) are all supported. (`CanonicalUser` also exists but is omitted; the post does not claim exhaustiveness, so this is fine.)
- The Lambda trust policy correctly uses `lambda.amazonaws.com` as the service principal and `sts:AssumeRole` as the action.
- `source_policy_documents` and `override_policy_documents` are real attributes, and the described behavior (override documents replace statements with matching SIDs) matches the official documentation.
- `not_actions` and `not_resources` are valid attributes on the `statement` block.
- The dynamic block uses correct syntax — iterator name defaults to the block name (`statement`), and `statement.key`/`statement.value` references work inside `content`.
- The `aws_iam_policy` and `aws_iam_role` resource attribute names (`policy`, `assume_role_policy`) are correct.

## Review Notes
- The intro phrase "compile-time validation" is slightly imprecise — Terraform validates at plan/apply time rather than having a true compile step — but the rest of the post correctly says "plan time", and the general claim is reasonable enough that no edit is warranted.
- The `restricted_access` example mixes MFA and IP allow-list conditions on an `Allow` statement. This is syntactically valid but semantically unusual — typically IP restrictions are enforced via an explicit `Deny` with `NotIpAddress` so they cannot be bypassed by another policy. The post does not claim this is a security best practice, so the example stands as-is for syntax illustration.
- The `dynamic` block example relies on Terraform's `title()` function treating the hyphen in bucket names as a word boundary (so `title("app-data")` becomes `App-Data`, then `replace(..., "-", "")` yields `AppData`). This works with current Terraform versions but depends on `title()`'s separator handling; not a correctness issue, just something to be aware of if the function's behavior ever changes.
- Terraform 1.0+ as the prerequisite is reasonable; the data source itself has existed since much earlier AWS provider versions, so any modern Terraform setup will work.
