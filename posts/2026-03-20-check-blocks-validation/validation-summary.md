# Validation Summary: How to Use Check Blocks for Infrastructure Validation in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider for Terraform/OpenTofu
- HTTP Provider for Terraform/OpenTofu
- Infrastructure as Code

## Sources Consulted
- OpenTofu Checks documentation: https://opentofu.org/docs/language/checks/
- OpenTofu Custom Conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu GA announcement: https://opentofu.org/blog/opentofu-is-going-ga/
- OpenTofu v1.6 upgrade guide: https://opentofu.org/docs/language/upgrade-guides/
- AWS provider `aws_db_instance` data source docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/db_instance.html.markdown
- AWS provider `aws_s3_bucket` data source docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/s3_bucket.html.markdown
- AWS provider `aws_s3_bucket_server_side_encryption_configuration` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_server_side_encryption_configuration.html.markdown
- AWS provider `aws_s3_bucket_public_access_block` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_public_access_block.html.markdown
- AWS provider `aws_instance` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- HTTP provider `http` data source docs: https://github.com/hashicorp/terraform-provider-http/blob/main/docs/data-sources/http.md

## Issues Found
- The introduction incorrectly said check blocks were introduced in OpenTofu 1.5. OpenTofu's first stable release is 1.6, so I removed the incorrect version claim and rewrote the introduction using the current OpenTofu checks documentation.
- The introduction described preconditions and postconditions as running during resource operations only. Official OpenTofu documentation says they apply to resources, data sources, and outputs, so I corrected that comparison.
- The basic HTTP example used `regex` against `data.http.website.status_code`. The HTTP provider documents `status_code` as a number, so I replaced that with a numeric 2xx range check.
- The database example used `data.aws_db_instance.main.deletion_protection`, but the `aws_db_instance` data source documentation does not expose `deletion_protection`. I changed that assertion to use the managed `aws_db_instance.main.deletion_protection` attribute instead.
- The S3 encryption example used `data.aws_s3_bucket.app.server_side_encryption_configuration`, but the `aws_s3_bucket` data source does not expose that attribute. I replaced it with a check against `aws_s3_bucket_server_side_encryption_configuration`.
- The `no_public_s3_access` example only checked `block_public_acls`, which does not fully support the claim that public access is blocked. I updated it to verify all four public access block settings.
- The tag validation example indexed `aws_instance.web.tags["Environment"]` directly, which can raise an invalid index error if the tag is missing. I changed the examples to use `tags_all`, `keys(...)`, and `lookup(...)` so they behave correctly and also account for provider default tags.
- The comparison table was inaccurate. I corrected when checks, preconditions, and postconditions run; removed the incorrect claim that postconditions taint resources; and clarified that only check blocks support scoped nested data sources.
- The description and conclusion used "continuous" language that implied background validation by the OpenTofu CLI itself. I adjusted that phrasing to match the documented behavior: checks run during plan/apply, while continuous post-provision validation is a TACOS capability.

## Review Notes
- The post is now technically sound for current OpenTofu documentation and current provider documentation.
- OpenTofu check blocks are non-blocking during normal CLI runs, but OpenTofu's documentation distinguishes this from TACOS continuous validation, which is a separate capability.
- I could not verify `tofu` command behavior locally because the `tofu` CLI is not installed in this workspace, so command validation was documentation-based.
