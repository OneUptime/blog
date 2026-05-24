# Validation Summary: How to Generate Random IDs with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp Random Provider (~> 3.6) — `random_id` resource
- HashiCorp AWS Provider (~> 5.0)
- AWS resources: `aws_s3_bucket`, `aws_cloudwatch_log_group`, `aws_ssm_parameter`, `aws_instance`
- Terraform built-in functions: `formatdate`, `timestamp`, `md5`, `file`, `toset`

## Sources Consulted
- HashiCorp Random Provider docs — `random_id` resource: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/id
- HashiCorp AWS Provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform language docs — `for_each`, `toset`, expressions: https://developer.hashicorp.com/terraform/language
- Terraform functions reference (`formatdate`, `timestamp`, `md5`, `file`): https://developer.hashicorp.com/terraform/language/functions
- Base64 encoding (RFC 4648) — standard vs URL-safe alphabets, padding behavior

## Issues Found
No technical issues found.

Verification details:
- `random_id` attributes documented (`hex`, `b64_url`, `b64_std`, `dec`) match the official provider schema.
- Arguments (`byte_length`, `keepers`, `prefix`) are correct; `prefix` is correctly described as prepended to the output formats.
- Byte-to-hex math is accurate (each byte = 2 hex characters): 2B→4ch, 3B→6ch, 4B→8ch, 6B→12ch, 8B→16ch, 16B→32ch.
- Collision space figures are correct: 2^16=65,536; 2^32≈4.29B; 2^64≈1.84×10^19; 2^128 (UUID-equivalent).
- Base64 output examples align with encoding rules: 8 bytes → 11 chars URL-safe (no padding), 12 chars standard (one `=` pad).
- Decimal range (`dec`) example for 8 bytes is within 2^64 − 1.
- AWS resource arguments (`bucket`, `name`, `type`, `value`, `ami`, `instance_type`, `tags`, `retention_in_days`) are valid in AWS provider v5.x.
- Terraform syntax for `for_each` with `toset()` and indexed access `random_id.service[each.value].hex` is correct.
- Provider version constraints are current and compatible.

## Review Notes
- Using `timestamp()` inside `keepers` (as shown in the deployment tracking example via `formatdate("YYYY-MM-DD", timestamp())`) will cause the keeper value to change on every plan/apply since `timestamp()` returns the current time during evaluation. In practice this means the `random_id` regenerates on every apply unless the date stays the same — typically acceptable for daily deployment tracking, but worth noting as it can surprise users. This is a known Terraform behavior, not an error in the post.
- The `DeployedAt = timestamp()` tag in the `aws_ssm_parameter` resource will likewise cause a tag drift on every apply; not technically incorrect but a common gotcha.
- The `random_id.bucket.hex` is reused across three S3 buckets, which means all three share the same suffix — the post's example output correctly reflects this and is the intended pattern shown.
- All examples are illustrative; the literal hex/base64/decimal "Example:" values are not derived from one another, which is fine and explicitly framed as examples.
