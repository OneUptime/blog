# Validation Summary: How to Write Assertions in Check Blocks in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (check and assert blocks, HCL built-in functions)
- Terraform (HCL syntax, shared with OpenTofu)
- AWS Provider for Terraform/OpenTofu (`aws_s3_bucket`, `aws_s3_bucket_public_access_block`, `aws_db_instance`, `aws_autoscaling_group`, `aws_instance`, `aws_vpc`)
- HCL functions: `startswith`, `lower`, `length`, `contains`, `keys`, `can`, `regex`, `cidrcontains`, `try`

## Sources Consulted
- OpenTofu Checks documentation: https://opentofu.org/docs/language/checks/
- OpenTofu Functions index: https://opentofu.org/docs/language/functions/
- OpenTofu `cidrcontains` function: https://opentofu.org/docs/language/functions/cidrcontains/
- OpenTofu `startswith` function: https://opentofu.org/docs/language/functions/startswith/
- Terraform Functions index: https://developer.hashicorp.com/terraform/language/functions
- Terraform AWS Provider docs (`aws_s3_bucket`, `aws_db_instance`, `aws_autoscaling_group`)

## Issues Found
No technical issues found.

All HCL syntax, function signatures, and AWS provider attribute references in the post are accurate:
- `check "name" { assert { condition = ...; error_message = "..." } }` matches the official OpenTofu schema (each `assert` block has exactly `condition` and `error_message`).
- `startswith()`, `lower()`, `length()`, `contains()`, `keys()`, `can()`, `regex()`, and `try()` are all valid OpenTofu/Terraform functions with the spellings shown.
- `cidrcontains()` is a valid OpenTofu built-in function (note: it is OpenTofu-specific and is not available in stock Terraform — but since this post is explicitly about OpenTofu, the usage is correct).
- AWS resource attributes referenced (`aws_db_instance.multi_az`, `backup_retention_period`, `storage_encrypted`, `deletion_protection`, `final_snapshot_identifier`, `aws_autoscaling_group.min_size`/`max_size`, `aws_s3_bucket.bucket`, `aws_s3_bucket_public_access_block.block_public_acls`, `aws_vpc.cidr_block`, `aws_instance.tags`/`instance_type`) are all real attributes on those resources.

## Review Notes
- The `cidrcontains` example will only work on OpenTofu (1.8+); it does not exist in stock Terraform. The post is titled and tagged "OpenTofu" so this is appropriate, but readers using Terraform alongside OpenTofu should be aware. The post's tag list does include "Terraform" which slightly muddies this — but the body consistently frames the discussion as OpenTofu, so this is acceptable.
- The `try(aws_s3_bucket.data.versioning[0].enabled, false)` example uses the legacy inline `versioning` block on `aws_s3_bucket`, which has been deprecated in AWS provider v4.0+ in favor of the standalone `aws_s3_bucket_versioning` resource. The example is still valid as an illustration of the `try()` pattern (the whole point being that the attribute might not exist), and `try()` will simply fall through to the default when the legacy block is absent. No change needed, but readers on modern AWS provider versions should reference `aws_s3_bucket_versioning.example.versioning_configuration[0].status == "Enabled"` instead in real-world usage.
- Minor: failed `check`/`assert` produce warnings rather than halting plan/apply — this is mentioned implicitly via "operational guardrails" but could be made more explicit in a future revision so readers understand the difference from `precondition`/`postcondition`. Not a correctness issue.
