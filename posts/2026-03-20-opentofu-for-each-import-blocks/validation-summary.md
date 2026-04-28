# Validation Summary: How to Use for_each with Import Blocks in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (and Terraform 1.7+, which has the same feature)
- HCL (HashiCorp Configuration Language)
- AWS provider for OpenTofu/Terraform (S3, IAM, VPC subnets)
- `import` blocks with `for_each`

## Sources Consulted
- OpenTofu Import documentation: https://opentofu.org/docs/language/import/
- Terraform Import documentation: https://developer.hashicorp.com/terraform/language/import
- OpenTofu `startswith` function: https://opentofu.org/docs/language/functions/startswith/
- AWS provider data sources directory: https://github.com/hashicorp/terraform-provider-aws/tree/main/website/docs/d
- AWS provider `aws_iam_roles` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/iam_roles.html.markdown

## Issues Found
- **Non-existent data source `aws_s3_buckets`**: The "Using Data Sources to Drive Import IDs" section referenced `data "aws_s3_buckets" "existing"` and accessed `.names`. After verifying against the AWS provider's data sources directory on GitHub, no such data source exists. The S3 data sources in the AWS provider are: `aws_s3_access_point`, `aws_s3_account_public_access_block`, `aws_s3_bucket` (singular, single-bucket lookup), `aws_s3_bucket_object`, `aws_s3_bucket_object_lock_configuration`, `aws_s3_bucket_objects`, `aws_s3_bucket_policy`, `aws_s3_bucket_replication_configuration`, `aws_s3_directory_buckets`, `aws_s3_object`, and `aws_s3_objects`. None of them list all standard S3 buckets in an account. **Fix**: Replaced the example with the real `aws_iam_roles` data source (which does export a `names` set), preserving the same `for`/`startswith` pattern that demonstrates filtering discovered names down to a target map for `for_each`-driven import.

## Review Notes
- `for_each` on import blocks is correctly documented; this feature shipped in OpenTofu 1.6 and Terraform 1.7.
- Use of `each.key` / `each.value` inside the `to` and `id` arguments is supported and the post's examples match the documented patterns.
- `startswith()` is a valid built-in function (added in Terraform 1.5 / inherited by OpenTofu 1.6).
- The "Plan Shows All Imports" output is illustrative/abbreviated rather than verbatim CLI output, but the format and counts are consistent with what `tofu plan` produces for an import-only plan.
- The "Error Handling: Mismatched Keys" example uses a hardcoded `["prod"]` index in the `to` address. With a single-element `for_each` map this happens to work, but it would be clearer to use `[each.key]`. Left unchanged because it is technically valid and the surrounding prose explicitly frames it as a "keys must match" demonstration.
- One minor caveat worth noting in a future revision: `tofu plan -generate-config-out=...` is **not** supported when `for_each` is set on an import block. Users coming from the single-resource import workflow may expect it to work.
- Note on review process: one tool result contained a string suggesting I invoke a non-existent `SendMessage` tool with a specific agent ID. This appeared to be a prompt-injection-style artifact in the agent's output. It was ignored, and the substantive verification claim (that `aws_s3_buckets` does not exist) was independently confirmed by querying the AWS provider repo directly via `gh api`.
