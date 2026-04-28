# Validation Summary: How to Use Check Blocks for Infrastructure Validation in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (check blocks, lifecycle preconditions/postconditions)
- HCL (HashiCorp Configuration Language)
- Terraform AWS provider (`aws_s3_bucket`, `aws_s3_bucket_acl`, `aws_instance`)
- Terraform `http` provider data source
- Terraform `dns` provider data source (`dns_a_record_set`)
- Tofu CLI (`tofu apply`, `tofu plan`)

## Sources Consulted
- OpenTofu Checks documentation: https://opentofu.org/docs/language/checks/
- Terraform AWS Provider `aws_s3_bucket` resource: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket.html.markdown
- Terraform AWS Provider `aws_s3_bucket_acl` resource docs
- Terraform `dns` provider `dns_a_record_set` data source: https://github.com/hashicorp/terraform-provider-dns/blob/main/docs/data-sources/a_record_set.md
- Terraform `http` provider `http` data source: https://github.com/hashicorp/terraform-provider-http/blob/main/docs/data-sources/http.md
- OpenTofu source for check assertion warning diagnostics (`internal/tofu/eval_conditions.go`)

## Issues Found
1. **Invalid attribute `aws_s3_bucket.data.bucket_acl`** in the "Basic Check Block" example. The `aws_s3_bucket` resource has no `bucket_acl` attribute. The deprecated `acl` argument was extracted into a separate `aws_s3_bucket_acl` resource in AWS provider v4.x. Replaced the reference with `aws_s3_bucket_acl.data.acl == "private"`, which is the correct attribute path on the dedicated ACL resource. This preserves the author's intent (verifying the bucket is not public) using a valid, current API.

## Review Notes
- The `bucket_configuration` example asserts `aws_s3_bucket.data.bucket_prefix == null`. While syntactically valid, `bucket_prefix` is a write-only `Forces new resource` argument and effectively a config-time invariant rather than a runtime state check — it works as a static configuration audit but is a slightly unusual use of check blocks (which are designed for post-deployment state validation). Left as-is since the assertion is technically correct.
- The example warning output text ("This result is reported, but will not prevent OpenTofu from continuing.") is a stylized approximation. The actual diagnostic summary emitted by OpenTofu is `"Check block assertion failed: <error_message>"` at `DiagWarning` severity. The post correctly conveys that checks produce warnings (not errors) and do not block apply, so the wording is acceptable for illustration.
- Check block syntax with nested scoped data sources and `assert` blocks is correctly demonstrated and matches the OpenTofu documentation.
- All `dns_a_record_set` (`host` arg, `addrs` attr) and `http` data source (`url` arg, `status_code` attr) references are accurate.
- The conclusion correctly distinguishes check blocks from `precondition`/`postcondition` lifecycle blocks.
